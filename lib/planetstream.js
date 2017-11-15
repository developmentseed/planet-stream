var MetaStream = require('./streams/MetaStream.js');
var DataStream = require('./streams/AugmentedDiffStream.js');
var Redis = require('ioredis');
var K = require('kefir');
var splitter = require('./utils/splitter.js');
var kue_cleanup = require('./utils/kue_cleanup.js');
var kue = require('kue');
var EventEmitter = require('events');

function PlanetStream (opts) {
  if (!(this instanceof PlanetStream)) return new PlanetStream(opts);

  // initialize logger
  var Log = require('log');
  var log = new Log(process.env.LOG_LEVEL || 'info');
  opts.log = log;

  var host = opts.host || '127.0.0.1';
  var port = opts.port || 6379;

  var redis = new Redis(port, host);
  var metaStream = MetaStream(opts);
  var dataStream = DataStream(opts); 
  var metaPipeline = redis.pipeline();

  /*
   * Create the job queue
   */
  var queue = kue.createQueue({
    prefix: 'q',
    redis: {
      port: port,
      host: host
    },
    jobEvents: false
  });

  /*
   * Queue Maintenance
   */
  queue.on('error', function (err) {
    log.error(err);
  });

  setInterval(function() {
    log.debug('Running queue cleanup');
    kue_cleanup(queue);
  }, 5 * 60 * 60 * 1000); // Run queue cleanup every 5 minutes

  /*
   * When metadata comes in, add it to the cache
   */

  metaStream.stream.map(JSON.parse).onValue(function (data) {
    log.debug('Batching before redis metadata: ' + data.id);
    metaPipeline.set(data.id, JSON.stringify(data));
    metaPipeline.expire(data.id, 180000); // Expire after three hours
  });

  // When stream stops for 2 seconds, output data to redis
  metaStream.stream.debounce(2000).onValue(function () {
    log.info('Adding metadata to redis');
    metaPipeline.exec(function (err) {if (err) log.error(err); });
    metaPipeline = redis.pipeline();
  });

  /*
   * When data comes in from overpass, create jobs to associate
   * metadata. Jobs are delayed 1 minute and have exponential backoff
   * with an expiry of 1 hour.
   */

  dataStream.stream.map(JSON.parse).onValue(function (data) {
    log.debug('Creating job for changeset ' + data.changeset + ' data');

    // Add the elements to redis and create a job
    redis.set('data:' + data.changeset, JSON.stringify(data.elements))
      .then(function () {
        return redis.expire('data:' + data.changeset, 180000);
      })
      .then(function () {
        queue.create('overpass', {
          id: data.changeset,
          title: data.changeset
        })
          .delay(60000)
          .attempts(8)
          .backoff({'type': 'exponential'}) // Keep the job for 2 hours
          .save();
      })
    ;
  });

  /*
   * Checks if the metadata is in redis
   */
  function findMetadata(id, job) {
    return redis.get(id).then(function (result) {
      job.log('[metadata found]: ' + result);
      if (result && result.match(/.*user.*/)) { // If the result is metadata, it has a user field
        return JSON.parse(result);
      }
      else {
        throw(new Error('metadata not found'));
      }
    });
  }

  /*
   * Process an item from the queue and send into the result stream
   * Once metadata is found, emit the 'metadata' event which the stream
   * subscribes to
   */
  class PlanetStreamEmitter extends EventEmitter {}
  const ps_emitter = new PlanetStreamEmitter();

  queue.process('overpass', function (job, done) {
    var changeset_id = job.data.id;
    log.debug(`processing ${changeset_id}`);
    return findMetadata(changeset_id, job)
      .then(function (metadata) {
        redis.get('data:' + metadata.id).then(function(data) {
          var fullChangeset = {};
          fullChangeset.metadata = metadata;
          fullChangeset.elements = JSON.parse(data) || [];
          log.debug('Parsing full changeset complete');
          ps_emitter.emit('changeset', fullChangeset);
          done(null, changeset_id);
        });
      })
      .catch( function (err) {
        done(err);
      });
  });


  /*
   * Stream that subscribes to the metadata event
   * When the event is triggered, grab data from redis, combine it
   * and send it to the stream
   */
  var changesets = K.fromEvents(ps_emitter, 'changeset');

  if (opts && opts.limit) {
    return changesets.map(function (changeset) {
        return splitter(changeset, opts.limit);
    }).flatten().map(JSON.stringify);
  }

  return changesets.map(JSON.stringify);

}

module.exports = PlanetStream;

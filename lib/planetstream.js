var MetaStream = require('./streams/MetaStream.js');
var DataStream = require('./streams/AugmentedDiffStream.js');
var Redis = require('ioredis');
var K = require('kefir');
var R = require('ramda');
var moment = require('moment');
var splitter = require('./utils/splitter.js');

function PlanetStream (opts) {
  if (!(this instanceof PlanetStream)) return new PlanetStream(opts);

  // initialize logger
  var Log = require('log');
  var log = new Log(process.env.LOG_LEVEL || 'info');
  opts.log = log;

  var host = opts.host || '127.0.0.1';
  var port = opts.port || 6379;

  var expire_seconds = opts.expire_seconds || 6000;

  var redis = new Redis(port, host);


  // --------------------------------------------------
  // ADDING DATA TO REDIS
  // --------------------------------------------------
  var metaStream = MetaStream(opts);
  var dataStream = DataStream(opts);
  var dataPipeline = redis.pipeline();
  var metaPipeline = redis.pipeline();

  metaStream.stream.map(JSON.parse).onValue(function (data) {
    log.debug('[metadata][batching]: ' + data.id);
    var now = moment();

    // Adds a key of the form 'metadata:key' with value the changeset metadata
    metaPipeline.set('metadata:' + data.id, JSON.stringify(data));

    // Adds an entry to the metadata expiry sorted set with score the current timestamp
    metaPipeline.zadd('metadata_table', now.format('X'), data.id);
  });

  // When stream stops for 2 seconds, output data to redis
  metaStream.stream.debounce(2000).onValue(function () {
    log.info('Adding metadata to redis');
    metaPipeline.exec(function (err) {if (err) log.error(err); });
    metaPipeline = redis.pipeline();
  });

  dataStream.stream.map(JSON.parse).onValue(function (data) {
    log.debug('[data][batching]: ' + data.changeset);

    var now = moment();

    // Adds a key of the form 'data:key' with value the changeset elements
    dataPipeline.set('data:' + data.changeset, JSON.stringify(data.elements));

    // Adds an entry to the data expiry sorted set with score the current timestamp
    dataPipeline.zadd('data_table', now.format('X'), data.changeset);
  });

  dataStream.stream.debounce(2000).onValue(function () {
    log.info('Adding data to redis');
    dataPipeline.exec(function (err) { if (err) console.log(err); });
    dataPipeline = redis.pipeline();
  });

  // --------------------------------------------------
  // MATCHING KEYS FROM REDIS
  // --------------------------------------------------

  // Takes an interval and a sorted set name
  // Returns a stream of array of sorted set keys every `interval` milliseconds
  function zkeystream(interval, table_name) {
    return K.withInterval(60000, function (emitter) {
      var table = redis.zscanStream(table_name);
      var table_keys = [];
      table.on('data', function (results) {
        table_keys = R.concat(table_keys, results);
      });
      table.on('end', function () {
        log.debug('[' + table_name + '][num_keys]: ' + table_keys.length);
        emitter.emit(table_keys);
      });
    });
  }

  var metadata_keys = zkeystream(60000, 'metadata_table');
  var data_keys = zkeystream(60000, 'data_table');

  // Join the metadata and data key streams
  // Intersection will find the common array subset
  // Flatten turns the stream of arrays it into a stream of keys
  var common_keys = metadata_keys.combine(data_keys, R.intersection).flatten();

  // We're going to do all sorts of mutations now so let's use a transaction
  // 1. Add a key to indicate a match
  // 2. Grab the data & metadata and send it down
  // 3. Delete the data & metadata keys from the global set, and the respective sorted sets
  var joinedElements = common_keys.flatMap(function (key) {
    log.debug('[matched_key][processing]: ' + key);
    return K.fromPromise(
      redis.multi().set('match:' + key, 1)
        .get('metadata:' + key)
        .get('data:' + key)
        .del('metadata:' + key)
        .del('data:' + key)
        .zrem('metadata_table', key)
        .zrem('data_table', key)
        .exec()
        .then(function (results) {
          log.debug('[matched_key][outputting]: ' + key);
          var changeset = {};
          var metadata = results[1];
          var data = results[2];
          changeset.metadata = JSON.parse(metadata[1]);
          changeset.elements = JSON.parse(data[1]);
          return changeset;
        })
        .catch(function (err) {
          log.error(err);
        })
    );
  });

  // TODO Cleanup worker that removes expired elements
  // Check if a 'matched' key exists for those expired elements
  // and log if they were not matched

  // --------------------------------------------------
  // OUTPUT
  // --------------------------------------------------
  if (opts && opts.limit) {
    return joinedElements.map(function (changeset) {
      return splitter(changeset, opts.limit);
    }).flatten().map(JSON.stringify);
  }

  return joinedElements.map(JSON.stringify);
}

module.exports = PlanetStream;

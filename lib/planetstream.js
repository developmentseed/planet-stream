var MetaStream = require('./streams/MetaStream.js');
var DataStream = require('./streams/AugmentedDiffStream.js');
var Redis = require('ioredis');
var K = require('kefir');
var splitter = require('./utils/splitter.js');

function PlanetStream (opts) {
  if (!(this instanceof PlanetStream)) return new PlanetStream(opts);

  var host = opts.host || '127.0.0.1';
  var port = opts.port || 6379;

  var redis = new Redis(port, host);
  var metaStream = MetaStream(opts);
  var dataStream = DataStream(opts);

  var dataPipeline = redis.pipeline();
  var metaPipeline = redis.pipeline();

  metaStream.stream.map(JSON.parse).onValue(function (data) {
    metaPipeline.set(data.id, JSON.stringify(data));
    metaPipeline.expire(data.id, 6000);
  });

  // When stream stops for 2 seconds, output data to redis
  metaStream.stream.debounce(2000).onValue(function () {
    metaPipeline.exec(function (err) {if (err) console.log(err); });
    metaPipeline = redis.pipeline();
  });

  dataStream.stream.map(JSON.parse).onValue(function (data) {
    dataPipeline.set('data:' + data.changeset, JSON.stringify(data.elements));
    dataPipeline.sadd('nometa', data.changeset);
    dataPipeline.expire('data:' + data.changeset, 6000);
  });

  dataStream.stream.debounce(2000).onValue(function () {
    dataPipeline.exec(function (err) { if (err) console.log(err); });
    dataPipeline = redis.pipeline();
  });

  var changesetInRedis = K.fromPoll(60000, function () {
    return K.fromPromise(
      redis.smembers('nometa').then(function (members) {
        return redis.del('nometa').then(function () {
          return members;
        })
      }));
  })
  .flatMap()
  .flatten()
  .flatMap(function (id) {
    return K.fromPromise(redis.exists(id).then(function (result) {
      return [id, result];
    }));
  })
  .delay(30000);

  // Take all the changesets where we couldn't find a match and stage
  // them back into nometa if the changeset still exists
  changesetInRedis.filter(function (resultTuple) {
    return resultTuple[1] === 0;
  }).map(function (resultTuple) {
    var id = resultTuple[0];
    return K.fromPromise(redis.exists(id).then(function (result) {
      if (result) {
        redis.sadd('nometa', id);
      }
    }));
  });

  // Take all the changesets that we know exist as data and metadata,
  // grab the metadata and add to each element in data
  var joinedElements = changesetInRedis.filter(function (resultTuple) {
    return resultTuple[1] === 1;
  }).flatMap(function (resultTuple) {
    var changesetId = resultTuple[0];
    return K.fromPromise(redis.get(changesetId).then(function (metadata) {
      return redis.get('data:' + changesetId).then(function (elements) {
        var fullChangeset = {};
        fullChangeset.metadata = JSON.parse(metadata);
        fullChangeset.elements = JSON.parse(elements);
        return fullChangeset;
      });
    }));
  }); 
  
  if (opts && opts.limit) {
    return joinedElements.map(function (changeset) {
      return splitter(changeset, opts.limit);
    }).flatten().map(JSON.stringify);
  }
  
  return joinedElements.map(JSON.stringify);
}

module.exports = PlanetStream;

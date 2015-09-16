var MetaStream = require('./lib/streams/MetaStream.js');
var DataStream = require('./lib/streams/AugmentedDiffStream.js');
var Redis = require('ioredis');
var K = require('kefir');

function PlanetStream (opts) {

  var redis = new Redis();
  var metaStream = MetaStream();
  var dataStream = DataStream();

  var dataPipeline = redis.pipeline();
  var metaPipeline = redis.pipeline();

  metaStream.stream.map(JSON.parse).onValue(function (data) {
    metaPipeline.set(data.id, JSON.stringify(data));
    metaPipeline.expire(data.id, 600);
  });

  // When stream stops for 2 seconds, output data to redis
  metaStream.stream.debounce(2000).onValue(function () {
    metaPipeline.exec(function (err) {if (err) console.log(err); });
    metaPipeline = redis.pipeline();
  });

  dataStream.stream.map(JSON.parse).onValue(function (data) {
    dataPipeline.lpush('data:' + data.changeset, JSON.stringify(data));
    dataPipeline.sadd('nometa', data.changeset);
    dataPipeline.expire('data:' + data.changeset, 600);
  });

  dataStream.stream.debounce(2000).onValue(function () {
    dataPipeline.exec(function (err) { if (err) console.log(err); });
    dataPipeline = redis.pipeline();
  });

  var changesetInRedis = K.fromPoll(60000, function () {
    return K.fromPromise(redis.smembers('nometa'));
  })
  .flatMap()
  .flatten()
  .flatMap(function (id) {
    return K.fromPromise(redis.exists(id).then(function (result) {
      return [id, result];
    }));
  })
  .delay(30000);

  // Take all the changeset where we couldn't find a match and stage
  // them back into a set
  var addThingsToStaging = changesetInRedis.filter(function (resultTuple) {
    return resultTuple[1] === 0;
  }).map(function (resultTuple) {
    return K.fromPromise(redis.sadd('staging', resultTuple[0]));
  });

  // Take all the changesets that we know exist as data and metadata,
  // grab the metadata and add to each element in data
  var joinedElements = changesetInRedis.filter(function (resultTuple) {
    return resultTuple[1] === 1;
  }).flatMap(function (resultTuple) {
    var changesetId = resultTuple[0];
    return K.fromPromise(redis.get(changesetId).then(function (metadata) {
      return redis.lrange('data:' + changesetId, 0, -1).then(function (elements) {
        return elements.map(function (listItem) {
          var osmElement = JSON.parse(listItem);
          osmElement.metadata = JSON.parse(metadata);
          return osmElement;
        });
      });
    }));
  })
  .flatten()
  .map(JSON.stringify);

  // When done with joining and staging, flush nometa by renaming
  // the staging set to nometa
  joinedElements.merge(addThingsToStaging)
  .debounce(2000)
  .onValue(function () {
    return redis.exists('staging').then(function () {
      return redis.rename('staging', 'nometa');
    });
  });

  return joinedElements;
}

module.exports = PlanetStream;

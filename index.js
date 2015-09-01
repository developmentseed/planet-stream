var MetaStream = require('./lib/streams/MetaStream.js');
var DataStream = require('./lib/streams/DataStream.js');
var split = require('split');
var Redis = require('ioredis');
var util = require('util');
var Readable = require('stream').Readable;

util.inherits(PlanetStream, Readable);

function PlanetStream (opts) {
  if (!(this instanceof PlanetStream)) return new PlanetStream(opts);

  Readable.call(this, opts);
  this.started = false;
}

PlanetStream.prototype._read = function () {
  if (!this.started) {
    this.run();
    this.started = true;
  }
};

PlanetStream.prototype.run = function () {
  var redis = new Redis();
  var stream = this;

  var dataPipeline = redis.pipeline();
  var metaPipeline = redis.pipeline();

  var metaTimer, dataTimer = null;

  MetaStream().pipe(split(JSON.parse)).on('data', function (data) {
    // Send data to redis after debounce
    clearTimeout(metaTimer);
    metaTimer = setTimeout(function () {
      metaPipeline.exec(function () {});
      metaPipeline = redis.pipeline();
    }, 2000);

    metaPipeline.set(data.id, JSON.stringify(data));
    metaPipeline.expire(data.id, 600);
  });

  DataStream().pipe(split(JSON.parse)).on('data', function (data) {
    // Send data to redis after debounce
    clearTimeout(dataTimer);
    dataTimer = setTimeout(function () {
      dataPipeline.exec(function () {});
      dataPipeline = redis.pipeline();
    }, 2000);

    dataPipeline.lpush('data:' + data.changeset, JSON.stringify(data));
    dataPipeline.sadd('nometa', data.changeset);
    dataPipeline.expire('data:' + data.changeset, 600);
  });

  function delay () { setTimeout(next, 60000); }

  function changesetIdExists (changesetIds) {
    var pipeline = redis.pipeline();
    changesetIds.forEach(function (id) {
      pipeline.get(id);
    });
    return pipeline.exec().then(function (results) {
      return results.map(function (resultTuple, index) {
        resultTuple[0] = changesetIds[index];
        return resultTuple;
      });
    });
  }

  function joinData (existResults) {
    var pipeline = redis.pipeline();
    existResults.forEach(function (resultTuple) {
      var id = resultTuple[0];
      var metadata = resultTuple[1];
      if (metadata) {
        pipeline.lrange('data:' + id, 0, -1);
      } else {
        pipeline.sadd('staging', id);
      }
    });
    return pipeline.exec().then(function (loadResults) {
      loadResults.forEach(function (resultTuple, index) {
        var resultData = resultTuple[1];
        if (resultData !== 0 && resultData !== 1) { // data is not a sadd
          resultData.forEach(function (listItem) {
            var osmElement = JSON.parse(listItem);
            osmElement.metadata = JSON.parse(existResults[index][1]);
            stream.push(JSON.stringify(osmElement));
          });
        }
      });
    });
  }

  function next () {
    redis.smembers('nometa')
    .then(changesetIdExists)
    .then(joinData)
    .then(function () {
      return redis.exists('staging').then(function () {
        return redis.rename('staging', 'nometa');
      });
    })
    .then(delay)
    .catch(function (err) {
      throw new Error('promise-chain', err);
    });
  }
  setTimeout(next, 30000);
};

module.exports = PlanetStream;

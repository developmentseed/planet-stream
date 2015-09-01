var MetaStream = require('./lib/streams/MetaStream.js');
var DataStream = require('./lib/streams/DataStream.js');
var split = require('split');
var Redis = require('ioredis');
var Promise = require('bluebird');
var util = require('util');
var Readable = require('stream').Readable;

util.inherits(PlanetStream, Readable);

function PlanetStream (opts) {
  if (!(this instanceof PlanetStream)) return new PlanetStream(opts);

  Readable.call(this, opts);
  this.started = false;
}

PlanetStream.prototype._read = function () {
  if (!this.started) this.run();
};

PlanetStream.prototype.run = function () {
  var redis = new Redis();
  var stream = this;

  MetaStream().pipe(split(JSON.parse)).on('data', function (data) {
    redis.set(data.id, JSON.stringify(data));
    redis.expire(data.id, 600);
  });

  DataStream().pipe(split(JSON.parse)).on('data', function (data) {
    redis.lpush('data:' + data.changeset, JSON.stringify(data));
    redis.sadd('nometa', data.changeset);
    redis.expire('data:' + data.changeset, 600);
  });

  function delay () { setTimeout(next, 60000); }

  function next () {
    redis.smembers('nometa')
    .then(function (changesetIds) {
      return Promise.all(changesetIds.map(function (id) {
        return redis.get(id).then(function (metadata) {
          if (metadata) {
            var toPush = {};
            toPush.metadata = JSON.parse(metadata);
            toPush.elements = [];
            redis.lrange('data:' + id, 0, -1).then(function (elements) {
              elements.forEach(function (element) {
                toPush.elements.push(JSON.parse(element));
              });
              stream.push(JSON.stringify(toPush) + '\n');
            }).catch(function (err) {
              throw new Error('lrange', err);
            });
          } else {
            return redis.sadd('staging', id);
          }
        });
      }));
    })
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

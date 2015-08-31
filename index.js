var MetaStream = require('./lib/streams/MetaStream.js');
var DataStream = require('./lib/streams/DataStream.js');
var split = require('split');
var Redis = require('ioredis');
var Promise = require('bluebird');
var util = require('util');
var Readable = require('stream').Readable;

util.inherits(JointStream, Readable);

function JointStream(opts) {
  if (!(this instanceof JointStream)) return new JointStream(opts);

  Readable.call(this, opts);
  this.started = false;
}

JointStream.prototype._read = function() {
  if (!this.started) this.run();
}

JointStream.prototype.run = function() {
  var redis = new Redis();
  var stream = this;

  MetaStream().pipe(split(JSON.parse)).on('data', function (data) {
    redis.set(data.id, JSON.stringify(data));
  });


  DataStream().pipe(split(JSON.parse)).on('data', function (data) {
    redis.lpush('data:'+data.changeset, JSON.stringify(data))
    redis.sadd('nometa', data.changeset);
  });

  setInterval(function () {
    redis.smembers('nometa')
    .then(function (changesetIds) {
      return Promise.all(changesetIds.map(function (id) {
        return redis.get(id).then(function (metadata) {
          if (metadata) {
            var toPush = {};
            toPush.metadata = metadata;
            toPush.elements = [];
            redis.lrange('data:'+id, 0, -1).then(function (elements) {
              elements.forEach(function (element) {
                toPush.elements.push(JSON.parse(element)); 
              })
              stream.push(JSON.stringify(toPush));
            })
          } else {
            return redis.sadd('staging', id); 
          }
        })
      }))
    })
    .then(function () {
      redis.rename('staging', 'nometa');
    })
  }, 30000)
}

module.exports = JointStream;

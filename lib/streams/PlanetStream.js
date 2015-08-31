'use strict';
var zlib = require('zlib');
var request = require('request');
var Readable = require('stream').Readable;
var util = require('util');

util.inherits(PlanetStream, Readable);

function PlanetStream (opts) {
  if (!(this instanceof PlanetStream)) return new PlanetStream(opts);

  opts = opts || {};
  Readable.call(this, opts);

  this.state = 0;
  this.delay = opts.delay || 60000;
  this.baseURL = opts.baseURL;
  this.started = false;
  this.parser = opts.parser;
  this.filetype = opts.filetype;
  this.getPlanetSequence = opts.planetSequence;
}

PlanetStream.prototype._read = function () {
  var that = this;
  if (!this.started) {
    that.getPlanetSequence(that, function (err, sequence) {
      if (err) throw new Error(err);
      that.state = sequence;
      that.run();
      that.started = true;
    });
  }
};

PlanetStream.prototype.run = function () {
  var that = this;

  function wait () {
    setTimeout(function () { next(); }, that.delay);
  }

  function next () {
    // Add padding to state
    var stateStr = that.state.toString().split('').reverse();
    var diff = 9 - stateStr.length;
    for (var i = 0; i < diff; i++) { stateStr.push('0'); }
    stateStr = stateStr.join('');

    // XML Parser can only process one document stream
    // We need to recreate it every time
    var xmlParser = that.parser();

    function getNextFile () {
      // Create request URL in the format xxx/xxx/xxx
      var url = '';
      for (i = 0; i < (stateStr.length / 3); i++) {
        url += stateStr[i * 3] + stateStr[i * 3 + 1] + stateStr[i * 3 + 2] + '/';
      }

      var nodata = true;
      var ss = request.get(that.baseURL + url.split('').reverse().join('') +
                           that.filetype)
      .pipe(zlib.createUnzip())
      .on('data', function (data) {
        nodata = (data.length === 0) && nodata;
      })
      .on('end', function () {
        if (nodata) {
          next();
          ss.end();
        }
      })
      .pipe(xmlParser)
      .on('data', function (data) {
        that.push(data);
      })
      .on('end', next)
      .on('error', function (err) {
        throw new Error('from parser', err);
      });
    }

    that.getPlanetSequence(that, function (err, sequence) {
      if (err) throw new Error(err);
      if (sequence >= that.state) {
        getNextFile();
        that.state += 1;
      } else {
        wait();
      }
    });
  }

  next();
};

module.exports = PlanetStream;


var ReplicationStream = require('./ReplicationStream.js');
var parser = require('../parsers/DataParser.js');
var request = require('request');

function DataStream () {

  function getDataState (that, callback) {
    request.get(that.baseURL + '/state.txt', function (err, response, body) {
      if (err) callback(err);
      else {
        var sequenceRe = /sequenceNumber=(\d+)/g;
        var matches = body.match(sequenceRe);
        callback(null, Number(matches[0].split('=')[1]));
      }
    });
  }
  return new ReplicationStream({
    replicationSequence: getDataState,
    baseURL: 'http://planet.osm.org/replication/minute',
    filetype: '.osc.gz',
    parser: parser
  });
}

module.exports = DataStream;

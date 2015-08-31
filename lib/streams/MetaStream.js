var PlanetStream = require('./PlanetStream.js');
var parser = require('../parsers/MetaParser.js');
var request = require('request');

function MetaStream () {

  function getMetaState (that, callback) {
    request.get(that.baseURL + '/state.yaml', function (err, response, body) {
      if (err) callback(err);
      else callback(null, Number(body.substr(body.length - 8)));
    });
  }
  return new PlanetStream({
    planetSequence: getMetaState,
    baseURL: 'http://planet.osm.org/replication/changesets',
    filetype: '.osm.gz',
    parser: parser
  });
}

module.exports = MetaStream;

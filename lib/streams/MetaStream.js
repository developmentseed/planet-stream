var K = require('kefir');
var request = require('request-promise');
var R = require('ramda');
var zlib = require('zlib');
var MetaParser = require('../parsers/MetaParser.js');
var log = require('../logger.js');

/* Takes a number representing the state and
 * outputs in the format xxx/xxx/xxx with zero
 * padding on the left
 * Number -> String
 */
function toDirectory (stateNumber) {
  // Pad with zeroes
  var stateStr = stateNumber.toString();
  var numZeros = 9 - stateStr.length;
  var zeros = R.repeat(0, numZeros);
  var pipe = R.pipe(
    R.split(''),
    R.concat(zeros),
    R.join(''),
    R.splitEvery(3),
    R.join('/'));
  return pipe(stateStr);
}

/* Maps a state text file to a state number
 * String -> Number
 */
function getState (stateTextFile) {
  return Number(stateTextFile.substr(stateTextFile.length - 8));
}

function MetaStream (opts) {
  opts = opts || {};

  var base_url = opts.base_url || 'http://planet.osm.org/replication/changesets';
  var pollFreq = opts.pollFreq || 30 * 1000;
  var state_param = opts.state_param || '/state.yaml';

  // State property
  var state = K.fromPoll(pollFreq, function () {
    if (opts.verbose) log('polling OSM planet');
    return K.fromPromise(request(base_url + state_param));
  })
  .flatMap()
  .map(getState)
  .skipDuplicates()
  .toProperty(R.always(0));

  // Stream of URls
  var urlStrings = state
  .changes()
  .map(toDirectory)
  .map(function (x) {
    var fname = base_url + '/' + x + '.osm.gz';
    if (opts.verbose) log('retrieving ' + fname);
    return fname;
  });

  // Stream of JSON objects
  var parsedData = urlStrings.flatMap(function (x) {
    return K.fromPromise(request({encoding: null, uri: x}));
  })
  .map(zlib.unzipSync)
  .map(R.toString)
  .flatMap(MetaParser)
  .map(R.toString);

  return {state: state, stream: parsedData};
}

module.exports = MetaStream;


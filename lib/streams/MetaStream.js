var K = require('kefir');
var request = require('request-promise');
var R = require('ramda');
var zlib = require('zlib');
var MetaParser = require('../parsers/MetaParser.js');
var moment = require('moment')

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

function pollState(opts) {
  var pollFreq = opts.pollFreq || 30 * 1000;
  var base_url = opts.base_url || 'http://planet.osm.org/replication/changesets';
  var state_param = opts.state_param || '/state.yaml';
  // State property
  var state = K.fromPoll(pollFreq, function () {
    opts.log.info('Polling OSM planet');
    var result = K.fromPromise(request(base_url + state_param));
    return result;
  })
  return state
    .flatMap()
    .map(getState)
    .skipDuplicates()
    .toProperty(R.always(0));  
}

function MetaStream (opts) {
  opts = opts || {};
  
  //var start = opts.start || null;
  //var end = opts.end || null;

  var base_url = opts.base_url || 'http://planet.osm.org/replication/changesets';
  var state_param = opts.state_param || '/state.yaml';

  // note that if opts is defaulted to {} as above this will cause an 
  // error when calling log functions because there's no default log
  var log = opts.log;

  //var start = 1875997;
  //var end = 1875999;
  var startDate = '2016-06-07 17:15:00';
  var endDate = '2016-06-07 17:17:00';

  if (startDate == null || endDate == null) {
    // real time, polling ever opts.pollFreq ms
    var state = pollState(opts);
  } else {
    startDate = moment(startDate, 'YYYY-M-DD HH:mm:ss');
    endDate = moment(endDate, 'YYYY-M-DD HH:mm:ss');
    // counter associated with d0 date
    var c0 = 1000000; // 0
    //var d0 = moment('2012-10-28 19:36:00', 'YYYY-M-DD HH:mm:ss');
    var d0 = moment('2014-10-07 07:58:00', 'YYYY-M-DD HH:mm:ss');
    //var start = (0.9888 * startDate.diff(d0, 'minute')).toFixed();
    //var end = (0.9888 * endDate.diff(d0, 'minute')).toFixed();
    var start = startDate.diff(d0, 'minute') + c0
    var end = endDate.diff(d0, 'minute')
    log.info("days since start", startDate.diff(d0, 'days'))
    log.info('Metadata diffs from %s - %s', start, end);
    var inc = start;
    var state = K.fromPoll(10000, function() {
      inc += 1;
      return inc - 1;
    }).skipDuplicates().toProperty(R.always(0));
    //state.onEnd(function() {
    //  state = pollState(opts);
    //});
  }

  // Stream of URls
  var urlStrings = state
        .changes()
        .map(toDirectory)
        .map(function (x) {
          var fname = base_url + '/' + x + '.osm.gz';
          log.info('Retrieving ' + fname + ' from planet');
          return fname;
        });

  // Stream of JSON objects
  var parsedData = urlStrings.flatMap(function (x) {
    return K.fromPromise(request({encoding: null, uri: x}));
  })
        .map(zlib.unzipSync)
        .map(R.toString)
        .map(function (x) {
          log.info('Metadata length: ' + x.length);
          return x;
        })
        .flatMap(MetaParser)
        .map(R.toString);

  return {state: state, stream: parsedData};
}

module.exports = MetaStream;


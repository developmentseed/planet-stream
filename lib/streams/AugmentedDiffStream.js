var K = require('kefir');
var request = require('request-promise');
var R = require('ramda');
var AugmentedDiffParser = require('../parsers/AugmentedDiffParser.js');
var moment = require('moment')


function pollState(opts) {
  var base_url = opts.base_url || 'http://overpass-api.de/api/augmented_diff';
  var state_param = opts.state_param || '_status';
  var pollFreq = opts.pollFreq || 60 * 1000;

  // State property
  var state = K.fromPoll(pollFreq, function () {
    opts.log.info('Polling Overpass');
    return K.fromPromise(request(base_url + state_param));
  })
        .flatMap()
        .map(function (x) { return Number(x); })
        .skipDuplicates()
        .toProperty(R.always(0));

  return state;
}


/* Function that takes an options object and returns
 * an augmented diff stream with an associated 'current state'
 */
function AugmentedDiffStream (opts) {
  opts = opts || {};

  var base_url = opts.base_url || 'http://overpass-api.de/api/augmented_diff';
  var id_param = opts.id_param || '?id=';
  var log = opts.log;

  var startDate = '2016-06-07 17:15:00';
  var endDate = '2016-06-07 17:17:00';

  // get augmented diff time index

  if (startDate == null || endDate == null) {
    var state = pollState(opts);
  } else {
    startDate = moment(startDate, 'YYYY-M-DD HH:mm:ss');
    endDate = moment(endDate, 'YYYY-M-DD HH:mm:ss');
    var d0 = moment('2012-09-12 06:55:00', 'YYYY-M-DD HH:mm:ss')
    var start = startDate.diff(d0, 'minute');
    var end = endDate.diff(d0, 'minute');
    log.info('augmented diffs from %s - %s', start, end);
    var inc = start;
    var state = K.fromPoll(10000, function() {
      inc += 1;
      return inc - 1;
    }).skipDuplicates().toProperty(R.always(0));
  }

  // Stream of URls
  var urlStrings = state
        .changes()
        .map(function (x) { return base_url + id_param + x; })
        .map(function (x) {
          log.info('Retrieving ' + x + ' from Overpass');
          return x;
        });

  var parsedData = urlStrings
        .flatMap(function (x) {
          return K.fromPromise(request(x));
        })
        .map(function (x) {
          log.info('Data length: ' + x.length);
          return x;
        })
        .flatMapConcat(AugmentedDiffParser)
        .map(R.toString);

  return {state: state, stream: parsedData};
}

module.exports = AugmentedDiffStream;

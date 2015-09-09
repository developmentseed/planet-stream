var K = require('kefir');
var request = require('request-promise');
var R = require('ramda');
var AugmentedDiffParser = require('../parsers/AugmentedDiffParser.js');

/* Function that takes an options object and returns
 * an augmented diff stream with an associated 'current state'
 */
function AugmentedDiffStream (opts) {

  var pollFreq = opts.pollFreq || 5 * 1000;
  var state_param = opts.state_param || '_status';
  var id_param = opts.id_param || '?id=';

  var base_url = opts.base_url || 'http://overpass-api.de/api/augmented_diff';

  // State property
  var state = K.fromPoll(pollFreq, function () {
    return K.fromPromise(request(base_url + state_param));
  })
  .flatMap()
  .map(Number)
  .skipDuplicates()
  .toProperty(R.always(0));

  // Stream of URls
  var urlStrings = state
  .changes()
  .map(function (x) { return base_url + id_param + x; });

  // Stream of changeset XML data
  var xmlData = urlStrings.flatMap(function (x) {
    return K.fromPromise(request(x));
  });

  // Stream of JSON objects
  var parsedData = xmlData.flatMap(AugmentedDiffParser).map(R.toString);

  return {state: state, stream: parsedData};
}

module.exports = AugmentedDiffStream;

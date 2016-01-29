// OSM Planet Stream service

// load environemntal variables
require('dotenv').config()

var planetStream = require('./lib/planetstream.js');
var kinesis = require('./lib/kinesis.js');
var R = require('ramda');

var tracked = ['#missingmaps'];


// start planet-stream
var diffs = planetStream();

// parse comments into hashtag list
function getHashtags (str) {
  if (!str) return [];
  var wordlist = str.split(' ');
  var hashlist = [];
  wordlist.forEach(function (word) {
    if (word.startsWith('#') && !R.contains(word, hashlist)) {
      word = word.trim();
      word = word.replace(/,\s*$/, '');
      hashlist.push(word);
    }
  });
  return hashlist;
}

// filter data for hashtags
diffs.map(JSON.parse)
.filter(function (data) {
  if (!data.metadata || !data.metadata.comment) {
    return false;
  }
  var hashtags = R.map(R.toLower, getHashtags(data.metadata.comment));
//  var intersection = R.intersection(hashtags, tracked);
//  return intersection.length > 0;
  return hashtags.length > 0;
})
// add a complete record to kinesis
.onValue(function (obj) { 
  var data = JSON.stringify(obj)
  if (obj.metadata) {
    var dataParams = {
      Data: data,
      PartitionKey: obj.metadata.id,
      StreamName: process.env.STREAM_NAME
    };
    kinesis.kin.putRecord(dataParams, function (err, data) {
      if (err) console.error(err);
      else console.log(data);
    });
  } else {
    console.log('No metadata for ' + obj);
  }
});

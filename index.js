// OSM Planet Stream service

// load environemntal variables
require('dotenv').config()

var planetStream = require('./lib/planetstream.js');
var kinesis = require('./lib/kinesis.js');
var R = require('ramda');

streamname = 'osmsim'

var diffs = planetStream();

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

var tracked = ['#osmgeoweek', '#missingmaps', '#hotosm-afghanistan-eq-1264', '#PeaceCorps'];

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
.onValue(function (obj) { 
  var data = JSON.stringify(obj)
  if (obj.metadata) {
    var dataParams = {
      Data: data,
      PartitionKey: obj.metadata.id,
      StreamName: process.env.STREAM_NAME
    };
    kinesis.kin.putRecord(dataParams, function (err, data) {
      if (err) console.err(err);
      else console.log(data);
    });
  } else {
    console.log('No metadata for ' + obj);
  }
});

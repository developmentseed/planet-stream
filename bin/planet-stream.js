#!/usr/bin/env node

// start planet-stream
var argv = require('minimist')(process.argv.slice(2));
var planetstream = require('../')({verbose: argv.v});
var R = require('ramda');

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

// Filter out records that have no metadata
planetstream.map(JSON.parse)
.filter(function (data) {
  if (argv['hashtags']) {
    if (data.metadata && data.metadata.comment) {
      return getHashtags(data.metadata.comment).length > 0;
    }
  } else {
    return data.hasOwnProperty('metadata');
  }
})
// print out record
.onValue(function (obj) {
  var payload = JSON.stringify(obj)
  console.log(payload);
});
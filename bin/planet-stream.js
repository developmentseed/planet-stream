#!/usr/bin/env node

// start planet-stream
var planetstream = new (require('../'));

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

// filter data here if desired
planetstream.map(JSON.parse)
.filter(function (data) {
  return true;
})
// print out record
.onValue(function (obj) { 
  var payload = JSON.stringify(obj)
  if (obj.metadata) {
  	console.log(payload);
  } else {
    console.log('No metadata for ' + obj);
  }
});
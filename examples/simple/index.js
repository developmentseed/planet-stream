var planetStream = require('../../')({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379
});

var diffs = planetStream();
var R = require('ramda');

function getHashtags (str) {
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

diffs.map(JSON.parse)
.filter(function (data) {
  if (!data.metadata.comment) {
    return false;
  }
  var hashtags = getHashtags(data.metadata.comment);
  return hashtags.length > 0;
})
.onValue(function (data) {
  console.log(data.metadata);
});

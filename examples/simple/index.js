var planetStream = require('../../');
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

var tracked = ['#hotosm-project-1257', '#huracanpatricia'];

diffs.map(JSON.parse)
.filter(function (data) {
  if (!data.metadata.comment) {
    return false;
  }
  var hashtags = getHashtags(data.metadata.comment);
  var intersection = R.intersection(hashtags, tracked);
  return intersection.length > 0;
})
.onValue(function (data) {
  console.log(data.metadata);
});

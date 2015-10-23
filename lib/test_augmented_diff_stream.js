var AugStream = require('./streams/AugmentedDiffStream.js');

var aug_stream = AugStream();

aug_stream.stream
  .map(JSON.parse)
  .onValue(function (data) {console.log(data)});

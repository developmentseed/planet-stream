var AugStream = require('./streams/AugmentedDiffStream.js');

var aug_stream = AugStream();

aug_stream.stream
  .map(JSON.parse)
  .map(function (data) { return data.changeset; })
  .onValue(function (data) {process.stdout.write(data + '\n'); });

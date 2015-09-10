var AugStream = require('./streams/AugmentedDiffStream.js');

var aug_stream = AugStream();

aug_stream.stream.onValue(console.log);

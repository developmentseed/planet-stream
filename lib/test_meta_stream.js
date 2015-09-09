var MetaStream = require('./streams/MetaStream.js');

var meta_stream = MetaStream({pollFreq: 5000});

meta_stream.stream.onValue(console.log);

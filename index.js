var MetaStream = require('./lib/streams/MetaStream.js');
var DataStream = require('./lib/streams/DataStream.js');
var split = require('split');

var metaKeys = {};
var dataKeys = {};

MetaStream().pipe(split(JSON.parse)).on('data', function (data) {
  if (!metaKeys[data.id]) {
    metaKeys[data.id] = 1;
  } else {
    metaKeys[data.id] += 1;
  }
  if (dataKeys[data.id] && metaKeys[data.id] === 1) {
    console.log('found match of meta in data!');
  }
});

DataStream().pipe(split(JSON.parse)).on('data', function (data) {
  if (!dataKeys[data.changeset]) {
    dataKeys[data.changeset] = 1;
  } else {
    dataKeys[data.changeset] += 1;
  }
  if (metaKeys[data.changeset] && dataKeys[data.changeset] === 1) {
    console.log('found match of data in meta!');
  }
});


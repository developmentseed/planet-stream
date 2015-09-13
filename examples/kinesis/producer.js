var planetStream = require('../../');
var AWS = require('aws-sdk');

AWS.config.region = 'us-west-1';
var kinesis = new AWS.Kinesis();

var diffs = planetStream();
diffs.onValue(function (data) {
  var obj = JSON.parse(data);
  if (obj.metadata) {
    var dataParams = {
      Data: data,
      PartitionKey: obj.metadata.id,
      StreamName: 'test'
    };
    kinesis.putRecord(dataParams, function (err, data) {
      if (err) console.err(err);
      else console.log(data);
    });
  } else {
    console.log('No metadata for ' + obj);
  }
});

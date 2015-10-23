var AWS = require('aws-sdk');
var kinesalite = require('kinesalite');

var kinesaliteServer = kinesalite({path: './mykdb'});
// Listen on port 4567
kinesaliteServer.listen(4567, function (err) {
  if (err) throw err;
  console.log('Kinesalite started on port 4567');
});
AWS.config.region = 'us-west-1';
var kinesis = new AWS.Kinesis({endpoint: 'http://localhost:4567'});
kinesis.listStreams(function (err, data) {
  console.log(data);
  if (err) console.log(err);
  if (data.StreamNames[0] !== 'test') {
    kinesis.createStream({StreamName: 'test', ShardCount: 1}, function (err, data) {
      if (err) console.log(err);
      else console.log(data);
    });
  }
});

var AWS = require('aws-sdk');

AWS.config.region = 'us-west-1';
var kinesis = new AWS.Kinesis();

kinesis.listStreams({}, function (err, data) {
	if (err) console.err(err);
	else console.log(data);
})

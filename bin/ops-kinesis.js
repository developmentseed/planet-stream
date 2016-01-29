// Read and test kinesis streams

// load environemntal variables
require('dotenv').config()

kinesis = require('../lib/kinesis.js');

kinesis.DescribeStream(process.env.STREAM_NAME).then(console.log);

/*
kinesis.GetRecords(stream, 10000).then(function(result) {
	result.forEach(function(record) {
		console.log(JSON.stringify(record));
	})
});
*/

/*
kinesis.getShardIterator(stream.StreamName, function(err, data) {
	if (err) console.log(err, err.stack);
	else console.log(data);
})
*/



/*
kinesis.stream({name: 'osmsim'}).on('data', function (data) {
  console.log(data.Data.toString());
});

*/
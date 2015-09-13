var kinesis = require('kinesis');

kinesis.stream({name: 'test', region: 'us-west-1'}).on('data', function (data) {
  console.log(data.Data.toString());
});


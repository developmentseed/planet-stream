// kinesis helper functions

var Promise = require('bluebird');
var shortid = require('shortid');
 
 var AWS = require('aws-sdk');
AWS.config.region = process.env.AWS_REGION;
kin = new AWS.Kinesis()
pkinesis = Promise.promisifyAll(kin);


function ListStreams() {
    return pkinesis.listStreamsAsync().then(function(result) {
        return result.StreamNames;
    });
};

function DescribeStream(name) {
    return pkinesis.describeStreamAsync({StreamName: name}).then(function(result) {
        return result.StreamDescription;
    });    
}

function StreamStatus(name) {
    return pkinesis.describeStreamAsync({StreamName: name}, function(err, data) {
        if (err) return "NOSTREAM";
    }).then(function(result) {
        return result.StreamDescription.StreamStatus;
    });
};


// create new stream, return once active
function CreateStream(name) {
    return ListStreams().then( function(names) {
        console.log('createstream', names);
        console.log(names);

        if (names.indexOf(name) == -1) {
            pkinesis.createStreamAsync({StreamName: name, ShardCount: 1}, function (err, data) {
              if (err) console.error(err);
              else console.log(data);
            });
        }
    });

}


// Remove stream
function DeleteStream(name) {

}

// add data to stream - does not need to be synchronous
function AddDataToStream(name, data) {
    var pid = shortid.generate();
    var dataParams = {
      Data: JSON.stringify(data),
      PartitionKey: pid,
      StreamName: name
    };

    pkinesis.putRecord(dataParams, function (err, data) {
      if (err) console.error(err);
    });

}

function GetRecords(name, num) {
    params = {ShardId: 'shardId-000000000000', ShardIteratorType: 'TRIM_HORIZON', StreamName: name}
    return pkinesis.getShardIteratorAsync(params).then(function(result) {
        var ishard = result.ShardIterator
        return pkinesis.getRecordsAsync({ShardIterator: result.ShardIterator, Limit: num}).then(function(result) {
            var data = []
            result.Records.forEach(function(record) {
                var payload = new Buffer(record.Data, 'base64').toString('utf8')
                data.push(JSON.parse(payload))
            })
            return data
        })
    })
}

module.exports = {
    ListStreams,DescribeStream,StreamStatus,CreateStream,DeleteStream,AddDataToStream,GetRecords,kin
};
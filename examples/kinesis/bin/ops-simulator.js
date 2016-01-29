#!/usr/bin/env node

// simulator
var Simulator = require('../lib/simulator.js');
var simulation = new Simulator();

kinesis = require('../lib/kinesis.js')

var streamName = 'osmsim';


function loopy() {
    var x = 0;
    while(x < 10) {
        data = simulation.randomChangeset();
        kinesis.AddDataToStream(streamName, data);
        x = x + 1;
        console.log('Added ' + data);
    }
}

// add random data to stream
function randomData() {
    data = simulation.randomChangeset()
    // put data into kinesis
}


console.log('Stream Status');
kinesis.StreamStatus(streamName).then(console.log);

// kinesis
console.log('Creating stream ' + streamName);
kinesis.CreateStream(streamName)
    //.then( loopy )
    .then( kinesis.ListStreams().then( console.log ) );


loopy();

// create stream
//kinesis.CreateStream('osm-sim-test').then( randomData );


// delete stream
//kinesis.DeleteStream().then();
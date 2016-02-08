#!/usr/bin/env node

// Test this code using the following
// cat test/mapathon.txt | bin/ps-splitter.js --limit=20

var argv = require('minimist')(process.argv.slice(2));
var split = require('split');
var through = require('through');
var splitter = require('../lib/utils/splitter.js');
var limit = argv.limit || 20;

// Map changeset to changesets and push downstream
var tr = through(function (line) {
  if (line.length === 0) return;
  var changeset = JSON.parse(line);

  var changesets = splitter(changeset, limit);

  changesets.forEach(function (changeset) {
    this.queue(JSON.stringify(changeset) + '\n');
  }.bind(this))
}, function () {
  this.queue(null);
});

// Read in stdin and pipe to line processor
process.stdin
.pipe(split())
.pipe(tr)
.pipe(process.stdout);


var planetStream = require('../../');
var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');

app.listen(8000);

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

var diffs = planetStream();

var buildings = diffs
.map(JSON.parse)
.filter(function (x) {
  return x.action === 'create' && x.type === 'way' &&
    x.tags.building;
});

buildings.onValue(function (x) {
  console.log(x);
  io.emit('buildings', x);
});

var expat = require('node-expat');
var through = require('through');

function MetaParser () {
  var _tempAttrs = {};
  var xmlParser = new expat.Parser('UTF-8');
  var stream = through(function (data) {
    if (data.length > 0) xmlParser.write(data);
  });

  function endTag (symbol, attrs) {
    if (symbol === 'changeset') {
      stream.queue(new Buffer(JSON.stringify(_tempAttrs) + '\n'), 'utf8');
    }
  }

  function startTag (symbol, attrs) {
    if (symbol === 'changeset') {
      if (attrs) {
        _tempAttrs = attrs;
      }
    }
    if (symbol === 'tag' && _tempAttrs && _tempAttrs.open === 'false') {
      _tempAttrs[attrs.k] = attrs.v;
    }
  }

  xmlParser.on('startElement', startTag);
  xmlParser.on('endElement', endTag);
  xmlParser.on('error', console.log);
  return stream;
}

module.exports = MetaParser;


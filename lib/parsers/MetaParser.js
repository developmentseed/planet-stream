var K = require('kefir');
var expat = require('node-expat');

/* Converts osm changeset file to a stream
 * of JSON objects
 * String -> Stream JSON
 */
function MetaParser (xmlData) {
  var xmlParser = new expat.Parser('UTF-8');
  var _tempAttrs = {};
  return K.stream(function (emitter) {
    function endTag (symbol, attrs) {
      if (symbol === 'changeset') {
        emitter.emit(new Buffer(JSON.stringify(_tempAttrs) + '\n'), 'utf8');
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
    xmlParser.on('error', emitter.error);
    xmlParser.on('end', emitter.end);

    xmlParser.write(xmlData);
  });
}

module.exports = MetaParser;

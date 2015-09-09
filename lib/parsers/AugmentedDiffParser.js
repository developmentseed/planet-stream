var K = require('kefir');
var R = require('ramda');
var expat = require('node-expat');

/* Converts osm changeset file to a stream
 * of JSON objects
 * String -> Stream JSON
 */
function AugmentedDiffParser (xmlData) {
  var xmlParser = new expat.Parser('UTF-8');
  var currentAction = '';
  var currentElement = {};
  var oldElement = {};
  var currentMode = '';
  return K.stream(function (emitter) {

    function isElement (symbol) {
      return (symbol === 'node' || symbol === 'way' || symbol === 'relation');
    }

    function endTag (symbol, attrs) {
      if (symbol === 'action') {
        emitter.emit(new Buffer(JSON.stringify(currentElement) + '\n'), 'utf8');
      }
    }

    function startTag (symbol, attrs) {
      if (symbol === 'action') {
        currentAction = attrs.type;
      }
      if (symbol === 'new' || symbol === 'old') {
        currentMode = symbol;
      }
      if (isElement(symbol)) {
        if (currentMode === 'new' && (currentAction === 'modify' ||
                                      currentAction === 'delete')) {
          oldElement = R.clone(currentElement);
          currentElement = attrs;
          currentElement.old = oldElement;
        } else {
          currentElement = attrs;
        }
        currentElement.action = currentAction;
        currentElement.type = symbol;
        currentElement.tags = {};
        if (symbol === 'way') {currentElement.nodes = []; }
        if (symbol === 'relation') {currentElement.members = []; }
      }
      if (symbol === 'tag' && currentElement) {
        currentElement.tags[attrs.k] = attrs.v;
      }

      if (symbol === 'nd' && currentElement && currentElement.type === 'way') {
        currentElement.nodes.push(attrs);
      }
      if (symbol === 'member' && currentElement && currentElement.type === 'relation') {
        currentElement.members.push(attrs);
      }
    }

    xmlParser.on('startElement', startTag);
    xmlParser.on('endElement', endTag);
    xmlParser.on('error', emitter.error);
    xmlParser.on('end', emitter.end);

    xmlParser.write(xmlData);
  });
}

module.exports = AugmentedDiffParser;


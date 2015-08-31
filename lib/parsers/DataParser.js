var expat = require('node-expat');
var through = require('through');

function DataParser () {
  var xmlParser = new expat.Parser('UTF-8');
  var currentAction = '';
  var currentElement = {};
  var stream = through(function (data) {
    if (data.length > 0) xmlParser.write(data);
  });

  function isChangeTag (symbol) {
    return (symbol === 'create' || symbol === 'modify' ||
            symbol === 'delete');
  }

  function isElement (symbol) {
    return (symbol === 'node' || symbol === 'way' || symbol === 'relation');
  }

  function endTag (symbol, attrs) {
    if (isElement(symbol)) {
      stream.queue(new Buffer(JSON.stringify(currentElement) + '\n'), 'utf8');
    }
  }

  function startTag (symbol, attrs) {
    if (isChangeTag(symbol)) {
      currentAction = symbol;
    }

    if (isElement(symbol)) {
      currentElement = attrs;
      currentElement.action = currentAction;

      // If processing first element in an action,
      // set changeset id to first element 'changeset' attribute
      if (currentAction.changeset === -1) {
        currentAction.changeset = attrs.changeset;
      }
      currentElement.type = symbol;
      currentElement.tags = {};

      if (symbol === 'way') { currentElement.nodes = []; }
      if (symbol === 'relation') { currentElement.members = []; }
    }

    if (symbol === 'tag' && currentElement) {
      currentElement.tags[attrs.k] = attrs.v;
    }

    if (symbol === 'nd' && currentElement && currentElement.type === 'way') {
      currentElement.nodes.push(attrs['ref']);
    }

    if (symbol === 'member' && currentElement &&
        currentElement.type === 'relation') {
      currentElement.members.push(attrs);
    }
  }

  xmlParser.on('startElement', startTag);
  xmlParser.on('endElement', endTag);
  xmlParser.on('error', console.log);

  return stream;
}

module.exports = DataParser;


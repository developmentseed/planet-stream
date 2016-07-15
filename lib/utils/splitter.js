var R = require('ramda');

// Takes a changeset from the stream and splits it
// into an array of changesets
module.exports = function (changeset, limit) {
  if (!R.has('elements', changeset) || limit < 1 || changeset.elements.length <= 1) {
    return [changeset];
  }
  var numElements = changeset.elements.length;

  var multiElements = R.splitEvery(limit, changeset.elements);

  // For each elementList, create a new changeset
  // with the same metadata as the original
  return R.map(function (elementList) {
    var obj = {};
    obj.metadata = changeset.metadata;
    obj.elements = elementList;
    return obj;
  }, multiElements);
}
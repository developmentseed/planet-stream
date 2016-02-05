var R = require('ramda');

// Takes a changeset from the stream and splits it
// into an array of changesets
module.exports = function (changeset, limit) {
  var numElements = changeset.elements.length;
  if (limit > 1) {
    var multiElements = R.splitEvery(limit, changeset.elements);

    // For each elementList, create a new changeset
    // with the same metadata as the original
    R.map(function (elementList) {
      var obj = {};
      obj.metadata = changeset.metadata;
      obj.elements = elementList;
      return obj;
    }, multiElements);
  }
  else {
    return [changeset];
  }
}
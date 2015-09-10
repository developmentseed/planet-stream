var planetStream = require('./');

// Only newly created buildings
planetStream().map(JSON.parse).filter(function (data) {
  return data.type === 'way' && data.action === 'create' &&
    data.tags.building;
}).onValue(console.log);


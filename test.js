var planetStream = require('./');

planetStream().on('data', function (data) {
  console.log(data + '');
});

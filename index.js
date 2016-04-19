
const name = require('./package.json').name;
const root = '/mobile/custom/' + name;

module.exports = function (app) {
  // app is an express 3 Application
  app.get(root + '/echo', function (req, res) {
    res.send(200, req.body);
  });
};

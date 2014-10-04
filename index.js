var Client   = require('./lib/client');
var Server   = require('./lib/server');
var FullNode = require('./lib/fullnode');

module.exports = {
  createServer: function(port, client) {
    return new Server(port);
  },
  createClient: function(nodes) {
    return new Client(nodes);
  },
  createFullNode: function(opts) {
    return new FullNode(opts);
  }
};

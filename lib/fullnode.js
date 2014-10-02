/*
** dside complete node
*/

var HOME   = process.env.HOME;
var config = require(HOME + '/.dside/config');
var Server = require('./server');
var Client = require('./client');

var FullNode = function(opts) {
  opts = opts || {};

  this.server = new Server(opts.port);
  this.client = new Client(opts.nodes);
};

FullNode.prototype.init = function(callback) {
  var self = this;

  self.server.listen(config.port, function() {
    self.client.connect(config.nodes, function() {
      if (callback) callback();
    });
  });
};

module.exports = FullNode;

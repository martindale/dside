/*
** dside server
*/

var network     = require('net');
var protocol    = require('./protocol');
var Message     = require('./message');
var PeerManager = require('./peerman');
var Peer        = require('./peer');
var log         = require('./log');

var Server = function(port) {
  var self = this;

  self.port    = port;
  self._server = network.createServer(self.handleConnection.bind(self));
  self.peers   = new PeerManager();
};

Server.prototype.handleConnection = function(connection) {
  var self = this;
  var peer = new Peer(connection);

  log.info('connected to new peer');
  self.peers.add(peer);
};

Server.prototype.listen = function(port, callback) {
  this._server.listen(port || this.port, function() {
    log.info('accepting connections on port ' + (port || this.port));
    if (callback) callback();
  });
};

module.exports = Server;

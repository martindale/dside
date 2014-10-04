/*
** dside peer wrapper
*/

var util         = require('util');
var EventEmitter = require('events').EventEmitter;
var carrier      = require('carrier');

var Peer = function(connection) {
  EventEmitter.call(this);

  this.identity   = null;
  this.connection = this.proxy(connection);
};

util.inherits(Peer, EventEmitter);

Peer.prototype.proxy = function(connection) {
  var self = this;

  carrier.carry(connection).on('line', function(d) {
    self.emit('data', d);
  });

  connection.on('end', function() {
    self.emit('end');
  });

  return connection;
};

Peer.prototype.send = function(message) {
  this.connection.write(message.toString());
};

module.exports = Peer;

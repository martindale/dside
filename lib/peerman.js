/*
** dside peer manager
*/

var Message = require('./message');
var Peer    = require('./peer');
var bitauth = require('bitauth');
var log     = require('./log');

var PeerManager = function() {
  this.peers = [];
};

PeerManager.prototype.add = function(peer) {
  var self = this;

  if (!(peer instanceof Peer)) {
    throw new TypeError('Object is not a Peer');
  }

  self.peers.push(peer);

  peer.on('data', function(data) {
    log.info('validating message from peer');
    Message.validate(data, function(valid) {
      if (valid) {
        var message = new Message().fromString(data);
        log.info('handling valid message from peer');
        Message.handle(peer, message);
        log.info('relaying remote message to peers');
        return self.relay(message);
      }
      log.warn('received invalid message from peer');
    });
  });

  peer.on('end', function() {
    self.remove(peer);
  });

  return self;
};

PeerManager.prototype.remove = function(peer) {
  var self = this;

  self.peers.forEach(function(p, index) {
    if (p === peer) {
      log.info('removing peer from list');
      self.peers.splice(index, 1);
    }
  });

  return self;
};

PeerManager.prototype.relay = function(msg) {
  this.peers.forEach(function(p) {
    if (p.identity !== bitauth.getSinFromPublicKey(msg.payload.pubkey)) {
      p.send(msg);
    }
  });
};

module.exports = PeerManager;

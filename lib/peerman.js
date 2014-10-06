/*
** dside peer manager
*/

var Message = require('./message');
var Peer    = require('./peer');
var bitauth = require('bitauth');
var log     = require('./log');
var Storage = require('./storage');
var config  = require(process.env.HOME + '/.dside/config');

var PeerManager = function() {
  this.peers = [];
};

PeerManager.prototype.add = function(peer) {
  var self = this;

  if (!(peer instanceof Peer)) {
    throw new TypeError('object is not a Peer');
  }

  if (self.peers.indexOf(peer) !== -1) {
    return log.warn('peer is already accounted for');
  }

  self.peers.push(peer);

  peer.on('data', function(data) {
    log.info('validating message from peer');
    Message.validate(data, function(valid) {
      if (valid) {
        var message = new Message().fromString(data);
        log.info('handling valid message from peer');
        Message.handle(peer, message);
        // unless it's an id msg, relay it
        var isVote    = message.payload.message.split('::')[0] !== 'id';
        var isTrusted = config.trusted.indexOf(
          bitauth.getSinFromPublicKey(message.payload.pubkey)
        ) !== -1;

        if (isVote && isTrusted) {
          log.info('relaying remote message to peers');
          self.relay(message);
        }
        return;
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

PeerManager.prototype.sync = function(peer) {
  var self = this;

  log.info('syncing local consensus with new peer');

  for (var c in Storage.database.collections) {
    var collection = Storage.database.collections[c];
    var documents  = collection.find({});

    documents.forEach(function(doc) {
      peer.send(new Message().fromString(doc._relay));
    });
  }
};

module.exports = PeerManager;

var async        = require('async');
var smoke        = require('smokesignal');
var Identity     = require('./identity');
var Message      = require('./message');
var Storage      = require('./storage');
var EventEmitter = require('events').EventEmitter;
var util         = require('util');
var log          = require('./log');

var DSide = function(config) {
  EventEmitter.call(this);

  this.node = smoke.createNode({
    port: config.port,
    address: config.address,
    seeds: config.seeds,
    minPeerNo: config.minPeers || 3,
    maxPeerNo: config.maxPeers || 12,
    pingTimeout: config.pingTimeout || 3000,
    logger: log
  });

  this.store = new Storage(config.storageFile);

  this.identity = new Identity({
    privKey: config.privateKey,
    pubKey: config.publicKey
  });

  this._setupListeners();
};

util.inherits(DSide, EventEmitter);

DSide.prototype._setupListeners = function() {
  var self = this;

  // connected to at least one peer
  self.node.on('connect', function() {
    log.info('Connected to network');
    // process incoming message broadcast stream
    self.node.broadcast.pipe(new Message.Parser()).pipe(new Message.Handler());
  });

  // all peers have disconnected
  self.node.on('disconnect', function() {
    log.info('Disconnected from network');
  });

  // new peer connected
  self.node.peers.on('add', function(peer) {
    log.info('Connected ' + peer.remoteAddress + ':' + peer.remotePort);
    // parse and handle incoming messages
    peer.pipe(new Message.Parser()).pipe(new Message.Handler());
    // sync local consensus with new peer
    peer.write(self.store.state());
  });

  // peer disconnected
  self.node.peers.on('remove', function(peer) {
    log.info('Disconnected ' + peer.remoteAddress + ':' + peer.remotePort);
  });
};

DSide.prototype.start = function() {
  var self = this;

  log.info('Starting DSide node');

  self.node.start();

  return self;
};

DSide.prototype.stop = function() {
  var self = this;

  self.node.stop();

  return self;
};

module.exports = DSide;

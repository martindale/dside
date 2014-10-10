var async        = require('async');
var smoke        = require('smokesignal');
var Identity     = require('./identity');
var Message      = require('./message');
var Storage      = require('./storage');
var EventEmitter = require('events').EventEmitter;
var util         = require('util');
var log          = require('./log');
var RPC          = require('./rpc');

var DSide = function(config) {
  EventEmitter.call(this);

  if (!config.debug) log.debug = new Function();

  this.config = config;

  this.node = smoke.createNode({
    port: config.port,
    address: config.address,
    seeds: config.seeds,
    minPeerNo: config.minPeers || 3,
    maxPeerNo: config.maxPeers || 12,
    pingTimeout: config.pingTimeout || 3000,
    logger: log
  });

  this.rpcServer = new RPC.Server(this);

  this.store = new Storage(config.storageFile);

  this.identity = new Identity({
    privKey: config.privateKey,
    pubKey: config.publicKey
  });

  this._setupListeners();
  this.rpcServer.listen(config.rpcPort);
};

util.inherits(DSide, EventEmitter);

DSide.prototype._setupListeners = function() {
  var self = this;

  // recevied a valid message
  self.on('message', function(msg) {
    log.info('Received message from ' + msg.data('id'));
  });

  // connected to at least one peer
  self.node.on('connect', function() {
    // process incoming message broadcast stream
    self.node.broadcast.pipe(
      new Message.Parser()
    ).pipe(new Message.Handler(self));
  });

  // all peers have disconnected
  self.node.on('disconnect', function() {
    self.node.broadcast.unpipe();
  });

  // new peer connected
  self.node.peers.on('add', function(peer) {
    // parse and handle incoming messages
    peer.pipe(new Message.Parser()).pipe(new Message.Handler(self));
    // sync local consensus with new peer
    //TODO - FIX ME!
    //self.store.state().pipe(peer);
  });

  // peer disconnected
  self.node.peers.on('remove', function(peer) {
    peer.unpipe();
  });
};

DSide.prototype.start = function() {
  var self = this;

  log.info('Starting DSide node on port ' + this.config.port);

  self.node.start();

  return self;
};

DSide.prototype.broadcast = function(key, value, callback) {
  var self = this;
  callback = callback || new Function();
  // set short id on message
  var data = {
    key: key,
    value: value,
    id: this.identity.id(),
    time: new Date().toJSON()
  };

  var message = new Message({
    body: JSON.stringify(data),
    pubkey: this.identity.publicKeyPEM
  });

  message.sign(self.identity);

  self.store.add(message, function(err) {
    if (err) {
      callback(err);
      return log.error(err.message);
    }

    self.node.broadcast.write(message.toString());
    callback(null, message);
  });
};

module.exports = DSide;

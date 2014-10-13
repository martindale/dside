var async        = require('async');
var os           = require('os');
var smoke        = require('smokesignal');
var Identity     = require('./identity');
var Message      = require('./message');
var Storage      = require('./storage');
var EventEmitter = require('events').EventEmitter;
var util         = require('util');
var log          = require('./log');
var RPC          = require('./rpc');
var natUpnp      = require('nat-upnp');

var DSide = function(config) {
  EventEmitter.call(this);

  var self = this;

  if (!config.debug) log.debug = new Function();

  self.config = config;

  log.info('Setting up external port mapping for NAT');

  self._setupNAT(function(err, ip) {
    if (err) {
      log.error(
        'Failed to map external port - does your gateway support UPnP?',
        'Reason: ' + err.message
      );
      log.warn('Peers outside your LAN won\'t be able to connect to you');
    }
    else {
      log.info('Port mapping successful')
    }

    self.node = smoke.createNode({
      port: config.port,
      address: ip || self._getIpAddress()[0],
      seeds: config.seeds.filter(function(s) {
        return !!s.address; // ignore seed if no address specified
      }),
      minPeerNo: config.minPeers || 3,
      maxPeerNo: config.maxPeers || 12,
      pingTimeout: config.pingTimeout || 3000,
      logger: log
    });

    self.rpcServer = new RPC.Server(self);

    self.store = new Storage(config.storageFile);

    self.identity = new Identity({
      privKey: config.privateKey,
      pubKey: config.publicKey
    });

    self._setupListeners();

    process.nextTick(function() {
      self.emit('ready');
    });
  });
};

util.inherits(DSide, EventEmitter);

DSide.prototype._setupNAT = function(callback) {
  var self   = this;
  var client = natUpnp.createClient();

  callback = callback || new Function();

  client.portMapping({
    description: 'DSide',
    public: self.config.port,
    private: self.config.port,
    ttl: 0 // indefinite lease
  }, function(err) {
    if (err) return callback(err);

    client.externalIp(function(err, ip) {
      if (err) return callback(err);
      callback(null, ip);
    });
  });
};

DSide.prototype._getIpAddress = function() {
  var ifaces   = os.networkInterfaces();
  var possible = [];

  for (var iface in ifaces) {
    for (var i = 0; i < ifaces[iface].length; i++) {
      var details = ifaces[iface][i];
      if (['IPv6', 'IPv4'].indexOf( details.family ) >= 0 && !details.internal) {
        possible.push(details.address);
      }
    }
  }

  return possible;
};

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
    log.info('Syncing local consensus with new peer');
    self.store.state().pipe(new Message.Transporter()).pipe(self.node.broadcast);
  });

  // peer disconnected
  self.node.peers.on('remove', function(peer) {
    peer.unpipe();
  });
};

DSide.prototype.start = function() {
  var self = this;
  var opts = self.node.options;

  log.info('Starting DSide on ' + opts.address + ':' + opts.port);

  self.rpcServer.listen(self.config.rpcPort);
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

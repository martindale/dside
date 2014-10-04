/*
** dside client
*/

var HOME         = process.env.HOME;
var util         = require('util');
var EventEmitter = require('events').EventEmitter;
var network      = require('net');
var Message      = require('./message');
var Peer         = require('./peer');
var bitauth      = require('bitauth');
var fs           = require('fs');
var log          = require('./log');
var config       = require(process.env.HOME + '/.dside/config');

var Client = function(nodes) {
  var self = this;

  EventEmitter.call(self);

  self._nodes = [].concat(nodes || []);
  self._queue = [];
  self._key   = null;
};

util.inherits(Client, EventEmitter);

Client.prototype.connect = function(nodes, callback) {
  var self = this;

  self._nodes = self._nodes.concat(nodes || []);

  fs.readFile(HOME + '/.dside/key', function(err, key) {
    if (err) return log.err(err.message);

    self._key = key.toString();

    log.info('identity loaded')
    log.info('opening connections with trusted nodes')

    self.open(callback);
  });
};

Client.prototype.open = function(callback) {
  var self = this;

  if (self._nodes.length === 0) {
    return callback(new Error('no trusted nodes were specified'));
  }

  self.connections = self._nodes.map(function(n) {
    var host   =  n.host || 'localhost';
    var client = network.createConnection(n.port, host, function() {
      log.info('connected to ' + host + ':' + n.port);

      client.connected = true;

      if (self.ready()) {
        log.info('connections established will all nodes');
        Client.identify(self._key, self.connections);
        if (callback) callback();
        else self.emit('ready');
      }

      client.on('data', function(data) {
        log.info('received relay message from ' + host + ':' + n.port);
        Message.handle(new Peer(client), new Message().fromString(data));
      });

      client.on('end', function() {
        log.warn('connection with ' + host + ':' + n.port + ' closed');
        client.connected = false;
      });
    });

    client.on('error', function(err) {
      log.err('failed to connect to ' + host + ':' + n.port);
    });

    return client;
  });
};

Client.prototype.ready = function() {
  var self = this;

  for (var c = 0; c < self.connections.length; c++) {
    if (!self.connections[c].connected) return false;
  }

  return true;
};

Client.identify = function(key, connections) {
  var self     = this;
  var pubkey   = bitauth.getPublicKeyFromPrivateKey(key);
  var identity = bitauth.getSinFromPublicKey(pubkey);
  var str      = 'id::' + identity;
  var message  = new Message(str, bitauth.sign(str, key), pubkey);

  log.info('identifying self to connections');
  
  connections.forEach(function(c) {
    c.write(message.toString())
  });
};

Client.prototype.broadcast = function(topic, answer) {
  var self = this;

  var str = topic + '::' + answer + '::' + new Date().toJSON();

  var message = new Message(
    str,
    bitauth.sign(str, self._key),
    bitauth.getPublicKeyFromPrivateKey(self._key)
  );

  log.info('broadcasting message to peers')

  self.connections.forEach(function(c) {
    if (c.connected) {
      c.write(message.toString())
    }
  });
};

module.exports = Client;

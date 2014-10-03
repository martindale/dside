/*
** dside server
*/

var network     = require('net');
var http        = require('http');
var protocol    = require('./protocol');
var Message     = require('./message');
var PeerManager = require('./peerman');
var Peer        = require('./peer');
var log         = require('./log');
var bitauth     = require('bitauth');
var express     = require('express');
var Storage     = require('./storage');
var config      = require(process.env.HOME + '/.dside/config');

var Server = function(port) {
  var self = this;

  self.port    = port;
  self.rpcPort = port + 1;
  self._server = network.createServer(self.handleConnection.bind(self));
  self._rpc    = http.createServer(self.handleRpcMessage());
  self.peers   = new PeerManager();
};

Server.prototype.handleConnection = function(connection) {
  var self = this;

  if (connection.remoteAddress === '127.0.0.1') {
    log.err('not allowing connection from same host');
    return connection.end();
  }

  log.info('connected to new peer');
  self.peers.add(new Peer(connection));
};

Server.prototype.handleRpcMessage = function(req, res) {
  var self    = this;
  var handler = express();

  handler.use(function(req, res, next) {
    if (req.connection.remoteAddress !== '127.0.0.1') {
      return res.status(401).send('not authorized');
    }
    next();
  });

  handler.use(require('body-parser').json());

  handler.post('/', function(req, res) {
    var payload = JSON.stringify(req.body);

    try {
      Message.validate(payload, function(valid) {
        if (!valid) throw new Error('invalid message format');
        var msg = new Message().fromString(payload);

        log.info('relaying local rpc vote command to peers')

        self.peers.relay(msg);
        Message.handle({}, msg);

        res.status(200).send();
      });
    }
    catch(err) {
      res.status(500).send(err.message);
    }
  });

  handler.get('/:topic', function(req, res) {
    var topic   = req.params.topic;
    var records = Storage.database.get(topic);

    res.status(200).send(records.find({}).map(function(v) {
      return { id: v.id, answer: v.answer }
    }));
  });

  return handler;
};

Server.prototype.listen = function(port, callback) {
  var self    = this;
  var tcpPort = port || self.port;
  var rpcPort = self.rpcPort || tcpPort + 1;

  self._server.listen(tcpPort, function() {
    log.info('accepting peer connections on port ' + tcpPort);
    self._rpc.listen(rpcPort, function() {
      log.info('accepting rpc messages on port ' + rpcPort);
      if (callback) callback();
    });
  });
};

module.exports = Server;

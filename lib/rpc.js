var http   = require('http');
var Router = require('node-simple-router');
var events = require('events');
var util   = require('util');
var qs     = require('querystring');
var log    = require('./log');
var RPC    = {};


RPC.Client = function(config) {
  this.host = config.address;
  this.port = config.rpcPort;
};

RPC.Client.prototype.send = function(type, path, payload, callback) {
  var options = {
    hostname: this.host,
    port: this.port,
    path: path,
    method: type
  };

  var body = '';
  var req  = http.request(options, function(res) {
    res.setEncoding('utf8');

    res.on('data', function (chunk) {
      body += chunk;
    });

    res.on('end', function() {
      if (res.statusCode !== 200) return callback(new Error(body));
      callback(null, body);
    });
  });

  req.on('error', function(err) {
    callback(err.message);
  });

  req.write(payload);
  req.end();
};

RPC.Client.prototype.submit = function(key, value, callback) {
  this.send('POST', '/submit', JSON.stringify({
    key: key,
    value: value
  }), function(err, data) {
    if (err) return callback(err);
    callback(null, JSON.parse(data));
  });
};

RPC.Client.prototype.recall = function(key, callback) {
  this.send('GET', '/recall/' + key, '', function(err, data) {
    if (err) return callback(err);
    callback(null, JSON.parse(data));
  });
};

RPC.Server = function(node) {
  events.EventEmitter.call(this);

  this.router = new Router({ log: log.info });
  this.server = http.createServer(this.router);
  this.node   = node;

  this._setupRouter();
};

util.inherits(RPC.Server, events.EventEmitter);

RPC.Server.prototype._setupRouter = function() {
  var self = this;

  self.router.post('/submit', function(request, response) {
    var body = request.body;

    if (request.connection.remoteAddress !== '127.0.0.1') {
      response.writeHead(401);
      return res.end('not authorized');
    }

    if (!body.key || !body.value) {
      response.writeHead(400);
      return response.end('bad request');
    }

    log.info('Received `submit` rpc command from local identity');

    self.emit('submit', { key: body.key, value: body.value });

    self.node.broadcast(body.key, body.value, function(err, doc) {
      if (err) {
        return response.writeHead(500) && response.end(err.message);
      }

      response.end(doc.body);
    });
  });

  self.router.get('/recall/:key', function(request, response) {
    var key = request.params.key;

    if (request.connection.remoteAddress !== '127.0.0.1') {
      response.writeHead(401);
      return response.end('not authorized');
    }

    if (!key) {
      response.writeHead(400);
      return response.end('bad request');
    }

    log.info('Received `recall` rpc command from local identity');

    self.emit('recall', { key: key });

    var key = key + '::' + self.node.identity.id();

    self.node.store.db.get(key, function(err, doc) {
      if (err) {
        response.writeHead(500);
        return response.end(err.message);
      }

      response.end(doc.body);
    });
  });
};

RPC.Server.prototype.listen = function(port) {
  this.server.listen(port, function() {
    log.info('Accepting local rpc commands on port ' + port);
  });
};

module.exports = RPC;

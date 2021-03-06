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

RPC.Client.prototype.recall = function(key, identity, callback) {
  var key = encodeURIComponent(key);
  var id  = encodeURIComponent(identity);
  var uri = '/recall?key=' + key + '&identity=' + identity;

  this.send('GET', uri, '', function(err, data) {
    if (err) return callback(err);
    callback(null, JSON.parse(data));
  });
};

RPC.Client.prototype.consensus = function(key, callback) {
  key = encodeURIComponent(key);

  this.send('GET', '/consensus?key=' + key, '', function(err, data) {
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
    var body    = request.body;
    var allowed = ['127.0.0.1', self.node.node.options.address]

    if (allowed.indexOf(request.connection.remoteAddress) === -1) {
      response.writeHead(401);
      return response.end('not authorized');
    }

    if (!body.key || !body.value) {
      response.writeHead(400);
      return response.end('bad request');
    }

    log.info('Received `submit` rpc command from local identity');

    self.emit('submit', { key: body.key, value: body.value });

    self.node.broadcast(body.key, body.value, function(err, doc) {
      if (err) {
        response.writeHead(500);
        return response.end(err.message);
      }

      response.end(doc.body);
    });
  });

  self.router.get('/recall', function(request, response) {
    var key      = decodeURIComponent(request.get.key);
    var identity = decodeURIComponent(request.get.identity);

    if (!key || !identity) {
      response.writeHead(400);
      return response.end('bad request');
    }

    log.info('Received `recall` rpc command');

    self.emit('recall', { key: key });

    self.node.store.db.get(key + '::' + identity, function(err, doc) {
      if (err) {
        response.writeHead(500);
        return response.end(err.message);
      }

      response.end(doc.body);
    });
  });

  self.router.get('/consensus', function(request, response) {
    var key = decodeURIComponent(request.get.key);

    if (!key) {
      response.writeHead(400);
      return response.end('bad request');
    }

    log.info('Received `consensus` rpc command');

    self.emit('consensus', { key: key });

    var consensus = {};
    var results   = [];

    self.node.store.db.each(function(doc) {
      var body = JSON.parse(doc.body);

      if (body.key !== key) return;

      if (typeof consensus[body.value] === 'undefined') {
        consensus[body.value] = 0;
      }

      consensus[body.value]++;
    }, function() {
      for (var val in consensus) {
        results.push({ value: val, records: consensus[val] });
      }

      results.sort(function(a, b) {
        return b.records - a.records;
      });

      response.end(JSON.stringify(results));
    }, true);
  });
};

RPC.Server.prototype.listen = function(port) {
  this.server.listen(port, function() {
    log.info('Accepting local rpc commands on port ' + port);
  });
};

module.exports = RPC;

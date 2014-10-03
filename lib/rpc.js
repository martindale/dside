/*
** dside rpc client
*/

var http    = require('http');
var fs      = require('fs');
var bitauth = require('bitauth');
var config  = require(process.env.HOME + '/.dside/config');
var Message = require('./message');

var LocalRpcClient = function(port) {
  var self = this;

  self.port    = port || config.port + 1;
  self.privKey = fs.readFileSync(process.env.HOME + '/.dside/key');
};

LocalRpcClient.prototype.send = function(topic, answer, callback) {
  var self    = this;
  var message = new Message(topic + '::' + answer + '::' + new Date().toJSON());

  message.sign(self.privKey);

  var options = {
    hostname: 'localhost',
    port: self.port,
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  var req = http.request(options, function(res) {
    var body = '';

    res.on('data', function (chunk) {
      body += chunk.toString();
    });

    res.on('end', function() {
      if (res.statusCode !== 200) return callback(new Error(body));
      callback();
    });
  });

  req.on('error', function(e) {
    callback(e);
  });

  req.end(message.toString());
};

LocalRpcClient.prototype.read = function(topic, callback) {
  var self = this;

  http.get('http://localhost:' + self.port + '/' + topic, function(res) {
    var body = '';

    res.on('data', function (chunk) {
      body += chunk.toString();
    });

    res.on('end', function() {
      if (res.statusCode !== 200) return callback(new Error(body));
      callback(null, JSON.parse(body));
    });
  }).on('error', function(err) {
    callback(err);
  });
};

module.exports = LocalRpcClient;

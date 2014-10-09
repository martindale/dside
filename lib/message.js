var stream = require('stream');
var util   = require('util');
var log    = require('./log');

var Message = function(contents) {
  this.body      = contents.body;
  this.pubkey    = contents.pubkey;
  this.signature = contents.signature;
};

Message.prototype.sign = function(identity) {
  return this.signature = identity.keypair.privateKey.sign(this.body);
};

Message.prototype.verify = function(identity) {
  return identity.keypair.publicKey.verify(this.body, this.signature);
};

Message.prototype.toString = function() {
  var message = {
    body: this.body,
    pubkey: this.pubkey,
    signature: this.signature
  };

  return JSON.stringify(message) + Message.terminator;
};

Message.terminator = '::TERM::';

// message parser transform stream
Message.Parser = function() {
  stream.Transform.call(this);

  this.buffer = '';
};

util.inherits(Message.Parser, stream.Transform);

Message.Parser._transform = function(chunk, encoding, callback) {
  var self  = this;
  var data  = '' + self.buffer + chunk.toString();
  var parts = data.split(Message.terminator);

  self.buffer = '';

  parts.forEach(function(part, i) {
    try {
      var json = JSON.parse(part);
      var msg  = new Message(json);

      if (msg.valid()) self.push(msg);
      else log.warn('discarding invalid message');
    }
    catch(err) {
      if (i === parts.length - 1) {
        self.buffer = part;
      }
      else {
        log.error('discarding malformed message');
      }
    }
  });

  callback();
};

// message handler readable stream
Message.Handler = function() {
  stream.Readable.call(this);
};

util.inherits(Message.Parser, stream.Readable);

Message.Parser._read = function(message) {
  log.info('got message', message);
};

module.exports = Message;

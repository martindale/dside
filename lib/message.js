/*
** dside message protocol
*/

var HOME     = process.env.HOME;
var protocol = require('./protocol');
var bitauth  = require('bitauth');
var config   = require(HOME + '/.dside/config');
var log      = require('./log');
var fs       = require('fs');

var Message = function(message, signature, pubkey) {
  this.payload = {
    message: message,
    signature: signature,
    pubkey: pubkey
  };
};

Message.prototype.sign = function(privkey) {
  this.payload.signature = bitauth.sign(this.payload.message, privkey);
  this.payload.pubkey    = bitauth.getPublicKeyFromPrivateKey(privkey);
};

Message.prototype.toString = function() {
  return JSON.stringify(this.payload);
};

Message.prototype.fromString = function(str) {
  var self   = this;
  var parsed = JSON.parse(str);

  self.payload.message   = parsed.message;
  self.payload.signature = parsed.signature;
  self.payload.pubkey    = parsed.pubkey;

  return self;
};

Message.prototype.selfOriginating = function() {
  var privKey = fs.readFileSync(HOME + '/.dside/key');
  return this.payload.pubkey === bitauth.getPublicKeyFromPrivateKey(privKey);
};

Message.validate = function(rawMessage, callback) {
  callback = callback || new Function();

  try {
    var msg = JSON.parse(rawMessage);

    protocol.messageFmt.forEach(function(prop) {
      if (typeof msg[prop] === 'undefined') {
        throw new Error('Invalid message format');
      }
    });

    bitauth.verifySignature(
      msg.message,
      msg.pubkey,
      msg.signature,
      function(err) {
        if (err) throw err;
        callback(true);
      }
    );

  }
  catch(err) {
    callback(false);
  }
};

Message.handle = function(peer, message) {
  var id = peer.identity = bitauth.getSinFromPublicKey(message.payload.pubkey);

  var msgParts = message.payload.message.split('::');

  if (msgParts.length !== 3) {
    return log.err('message format is invalid, ignoring');
  }

  if (config.trusted !== '*' && config.trusted.indexOf(peer.identity) === -1) {
    if (!message.selfOriginating()) {
      return log.warn('ignoring message from untrusted peer ' + peer.identity);
    }
  }

  if (!message.selfOriginating()) {
    log.info('handling message from trusted peer ' + peer.identity);
  }
  else {
    log.info('handling message from local rpc identity ' + peer.identity);
  }

  var topic  = msgParts[0];
  var answer = msgParts[1];
  var time   = new Date(msgParts[2]);
  
  require('./storage').recordAnswer({
    topic: topic,
    id: id,
    answer: answer,
    time: time
  }, message.toString(), function(err) {
    if (err) return log.err(err.message);
    log.info('recorded answer, consensus updated');
  });
};

module.exports = Message;

var stream   = require('stream');
var util     = require('util');
var log      = require('./log');
var Identity = require('./identity');
var forge    = require('node-forge');

var Message = function(contents) {
  this.body      = contents.body;
  this.pubkey    = contents.pubkey;
  this.signature = contents.signature;
};

Message.prototype.sign = function(identity) {
  var md = forge.md.sha1.create();
  md.update(this.body, 'utf8');
  this.signature = identity.keypair.privateKey.sign(md);
  return this;
};

Message.prototype.data = function(key) {
  if (key) {
    return JSON.parse(this.body)[key];
  }
  return JSON.parse(this.body);
};

Message.prototype.verify = function(identity) {
  var md = forge.md.sha1.create();
  md.update(this.body, 'utf8');
  return identity.keypair.publicKey.verify(md.digest().bytes(), this.signature);
};

Message.prototype.toString = function() {
  var message = {
    body: this.body,
    pubkey: this.pubkey,
    signature: this.signature
  };

  return Message.terminator + JSON.stringify(message) + Message.terminator;
};

Message.prototype.valid = function() {
  var hasRequired = !!(this.body && this.pubkey && this.signature);
  var parsed      = null;

  try { parsed = JSON.parse(this.body) } catch(err) { return false }

  var qualified   = !!(parsed.id && parsed.key && parsed.value && parsed.time);
  var formatValid = qualified && hasRequired;

  var remoteIdentity = new Identity({ pubKey: this.pubkey });
  var validSignature = this.verify(remoteIdentity);
  var idMatchesKey   = remoteIdentity.id() === parsed.id;

  return formatValid && validSignature && idMatchesKey;
};

Message.terminator = '::TERM::';

// message parser transform stream
Message.Parser = function() {
  stream.Transform.call(this);

  this._buffer = '';
};

util.inherits(Message.Parser, stream.Transform);

Message.Parser.prototype._transform = function(chunk, encoding, callback) {
  var self  = this;
  var data  = '' + self._buffer + chunk.toString();
  var parts = data.split(Message.terminator);

  self._buffer = '';

  parts.forEach(function(part, i) {
    if (!part) return;

    try {
      var json = JSON.parse(part);
      var msg  = new Message(json);

      if (msg.valid()) self.push(JSON.stringify(json));
      else log.warn('Discarding invalid message');
    }
    catch(err) {
      if (i === parts.length - 1) {
        self._buffer = part;
      }
      else {
        log.error('Discarding malformed message', err.stack);
      }
    }
  });

  callback();
};

// message handler writable stream
Message.Handler = function(node) {
  stream.Writable.call(this);

  this.node = node;
};

util.inherits(Message.Handler, stream.Writable);

Message.Handler.prototype._write = function(message) {
  var msg = new Message(JSON.parse(message));

  // emit message event on node
  this.node.emit('message', msg);
  // add message record to storage
  this.node.store.add(msg);
};

// message transporter transform stream
Message.Transporter = function() {
  stream.Transform.call(this, { objectMode: true });
};

util.inherits(Message.Transporter, stream.Transform);

Message.Transporter.prototype._transform = function(doc, enc, done) {
  var self = this;
  var msg  = new Message(doc);

  self.push(msg.toString());
  done();
};

module.exports = Message;

var HOME         = process.env.HOME;
var APP          = HOME + '/.dside/';
var Tiny         = require('tiny');
var log          = require('./log');
var EventEmitter = require('events').EventEmitter;
var util         = require('util');
var stream       = require('stream');
var Message      = require('./message');

var Storage = function(dataFile) {
  var self = this;

  EventEmitter.call(self);

  self.dataFile = APP + dataFile;

  // load db file descriptor
  Tiny(self.dataFile, function(err, db) {
    if (err) {
      self.emit('error', err);
      return log.error(err);
    }

    self.db     = db;
    self._ready = true;

    log.info('storage ready');
    self.emit('ready');
  });
};

util.inherits(Storage, EventEmitter);

Storage.prototype.add = function(msg, callback) {
  var self = this;
  var key  = msg.data('key') + '::' + msg.data('id');
  callback = callback || new Function();

  // perform message record lookup
  self.db.get(key, function(err, doc) {
    // if (err) return callback(err);

    if (doc) {
      var msgDoc  = new Message(doc);
      var docTime = new Date(msgDoc.data('time'));
      var msgTime = new Date(msg.data('time'));

      if (JSON.stringify(msgDoc) === JSON.stringify(msg)) {
        return callback(null, msgDoc);
      }

      if (docTime > msgTime) {
        return callback(
          new Error('Refusing to overwrite record with obsolete message')
        );
      }
    }

    self.db.set(key, msg, function(err) {
      if (err) return callback(err);
      log.info('Updated record ' + key);
      callback(null);
    });
  });
};

Storage.prototype.state = function() {
  return this.db.createReadStream({ values: true, keys: false });
};

module.exports = Storage;

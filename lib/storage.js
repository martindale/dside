var HOME         = process.env.HOME;
var APP          = HOME + '/.dside/';
var Tiny         = require('tiny');
var log          = require('./log');
var EventEmitter = require('events').EventEmitter;
var util         = require('util');

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

Storage.prototype.add = function(msg) {
  // perform message record lookup
  // if exists, check timestamp
  // if old, then ignore
  // otherwise update record
};

Storage.prototype.state = function() {
  // return readable stream of all stored database messages
  return '';
};

module.exports = Storage;

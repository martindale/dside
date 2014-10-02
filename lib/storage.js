/*
** dside storage
*/

var footon = require('footon');
var log    = require('./log');

var Storage = function() {
  this.name = 'dcide';
};

Storage.prototype.recordAnswer = function(topic, id, answer, time, callback) {
  var self = this;

  self.database = footon(self.name).on('ready', function() {
    var collection = self.database.get(topic);
    var record     = collection.find({ id: id })[0];

    if (record) {
      if (time > record.timestamp) {
        return callback(new Error('Answer timestamp is obsolete'));
      }
      record.answer = answer;
      return collection.save(callback);
    }

    collection.add({ id: id, answer: answer, timestamp: time });
    collection.save(callback);
  });
};

module.exports = new Storage();

/*
** dside storage
*/

var footon = require('footon');
var log    = require('./log');

var Storage = function() {
  this.name     = 'dside';
  this.database = footon(this.name)
};

Storage.prototype.recordAnswer = function(doc, message, callback) {
  var self       = this;
  var collection = self.database.get(doc.topic);
  var record     = collection.find({ id: doc.id })[0];

  if (record) {
    record.answer = doc.answer;
    return collection.save(callback);
  }

  collection.add({
    id: doc.id,
    answer: doc.answer,
    timestamp: doc.time,
    _relay: message
  });

  collection.save(callback);
};

module.exports = new Storage();

var log = require('../lib/log');
var APP = process.env.HOME + '/.dside';

require('./bootstrap')(APP, function(err) {
  if (err) return log.err(err);
  log.info('finished');
});

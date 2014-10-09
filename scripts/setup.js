var log = require('../lib/log');

require('./bootstrap')(function(err) {
  if (err) return log.err(err);
  log.info('finished');
});

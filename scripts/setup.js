var log = require('../lib/log');

require('../lib/bootstrap')(function(err) {
  if (err) return log.err(err);
  log.info('Configuration and Key written to ' + process.env.HOME + '/.dside');
});

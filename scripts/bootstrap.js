/*
** dside bootstapper
*/

var HOME     = process.env.HOME;
var fs       = require('fs');
var log      = require('../lib/log');
var async    = require('async');
var Identity = require('../lib/identity');

module.exports = function(callback) {
  callback = callback || new Function();

  async.series([
    checkAppDir,
    checkPrivateKey,
    createConfigFile
  ], function(err) {
    if (err) return log.error(err);
    callback();
  });

};

function checkAppDir(callback) {
  fs.exists(HOME + '/.dside', function(exists) {
    if (!exists) {
      log.info('creating app directory at ' + HOME + '/.dside');
      return fs.mkdir(HOME + '/.dside', function(err) {
        if (err) return callback(err);
        callback()
      });
    }
    log.info('app directory already exists');
    callback();
  });
};

function checkPrivateKey(callback) {
  fs.exists(HOME + '/.dside/identity.key', function(exists) {
    if (!exists) {
      log.info('generating identity - this can take a moment');
      return Identity.generate(function(err, keypair) {
        fs.writeFileSync(HOME + '/.dside/identity.key', keypair.privateKey);
        fs.writeFileSync(HOME + '/.dside/identity.pub', keypair.publicKey);
        callback();
      });
    }
    log.info('identity already exists');
    callback();
  });
};

function createConfigFile(callback) {
  var defaultConfig = JSON.stringify(require('../config.example'), null, 2);

  log.info('copied default config to ' + HOME + '/.dside/config.json');
  fs.writeFile(HOME + '/.dside/config.json', defaultConfig, function(err) {
    if (err) return callback(err);
    callback();
  });
};

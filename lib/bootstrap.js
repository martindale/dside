/*
** dside bootstapper
*/

var HOME    = process.env.HOME;
var fs      = require('fs');
var bitauth = require('bitauth');

module.exports = function(callback) {

  fs.exists(HOME + '/.dside', function(exists) {
    if (!exists) {
      return fs.mkdir(HOME + '/.dside', function(err) {
        if (err) return callback(err);
        createPrivateKey(function(err) {
          if (err) return callback(err);
          createConfigFile(callback)
        });
      });
    }
    else {
      fs.exists(HOME + '/.dside/key', function(exists) {
        if (!exists) {
          return createPrivateKey(function(err) {
            if (err) return callback(err);
            createConfigFile(callback)
          })
        }
        callback();
      });
    }
  });

};

function createPrivateKey(callback) {
  var privKey = bitauth.generateSin().priv;

  fs.writeFile(HOME + '/.dside/key', privKey, function(err) {
    if (err) return callback(err);
    callback();
  });
};

function createConfigFile(callback) {
  var config = JSON.stringify({
    port: 81337,
    nodes: [{ host: '', port: 81337 }],
    trusted: []
  }, null, 2);

  fs.writeFile(HOME + '/.dside/config.json', config, function(err) {
    if (err) return callback(err);
    callback();
  });
};

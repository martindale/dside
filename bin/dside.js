#!/usr/bin/env node

var util            = require('util');
var log             = require('../lib/log');
var fs              = require('fs');
var program         = require('commander');
var DSide           = require('..');
var bootstrap       = require('../scripts/bootstrap');
var defaultDataDir  = process.env.HOME + '/.dside';
var defaultConfPath = defaultDataDir + '/config.json';
var Identity        = require('../lib/identity');

program.version(require('../package').version);

program
  .command('submit')
  .description('submit a key-value record to the network')
  .option('-k, --key <key>', 'key for submitted value')
  .option('-v, --value <value>', 'value for specified key')
  .action(function(env) {
    if (!env.key || !env.value) {
      return log.error('a key and value are required to vote')
    }


  });

program
  .command('recall')
  .description('recall a record from storage')
  .option('-k, --key <key>', 'key for submitted value')
  .option('-i, --identity <id>', 'pubkey hash of record author', new Identity({
    pubKey: 'identity.pub',
    privKey: '/identity.key'
  }).id())
  .action(function(env) {
    if (!env.key) {
      return log.error('a key is required to recall')
    }

    var dside = new DSide(require(defaultConfPath));

    dside.store.on('ready', function() {
      dside.store.db.get(env.key + '::' + env.identity, function(err, doc) {
        if (err) return log.error(err.message);
        var body = JSON.parse(doc.body);
        log.info('recalled record:', body.key + ' = ' + body.value);
      });
    });
  });

program
  .command('consensus')
  .description('retrieve value aggregate for given key')
  .option('-k, --key <key>', 'key for consensus (value aggregate)')
  .action(function(env) {
    if (!env.key) {
      return log.error('a topic is required to gain consensus')
    }


  });

program
  .command('start')
  .description('join a dcide network')
  .option('-c, --config <path>', 'path to config file to use', defaultConfPath)
  .action(function(env) {
    if (!fs.existsSync(env.config)) {
      return log.error('failed to lookup config file');
    }

    var config = fs.readFileSync(env.config);

    try {
      config = JSON.parse(config);
    }
    catch(err) {
      return log.error('failed to parse config file');
    }

    new DSide(config).start();
  });

program
  .command('bootstrap')
  .description('generate identity keys and default config file')
  .option('-d, --datadir <dirpath>', 'directory for app data', defaultDataDir)
  .action(function(env) {
    bootstrap(env.datadir, function(err) {
      if (err) return log.err(err);
      log.info('finished');
    });
  });

program.parse(process.argv)

if (process.argv.length < 3) {
  return program.help();
}

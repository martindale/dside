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
var RPC             = require('../lib/rpc');

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

    var rpcc = new RPC.Client(require(defaultConfPath));

    rpcc.submit(env.key, env.value, function(err, doc) {
      if (err) return log.error(err.message);
      log.info('submitted value "' + doc.value + '" for key "' + doc.key + '"');
    });
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

    var rpcc = new RPC.Client(require(defaultConfPath));

    rpcc.recall(env.key, env.identity, function(err, doc) {
      if (err) return log.error(err.message || err);
      log.info('recalled value "' + doc.value + '" for key "' + doc.key + '"');
    });
  });

program
  .command('consensus')
  .description('retrieve value aggregate for given key')
  .option('-k, --key <key>', 'key for consensus (value aggregate)')
  .action(function(env) {
    if (!env.key) {
      return log.error('a key is required to aggregate values for consensus')
    }

    var rpcc = new RPC.Client(require(defaultConfPath));

    rpcc.consensus(env.key, function(err, docs) {
      if (err) return log.error(err.message || err);
      if (!docs.length) return log.info('no results to aggregate for that key');

      log.info('---------------');

      docs.forEach(function(doc, index) {
        log.info('');
        if (index === 0) {
          log.info('Top Value: ' + doc.value);
          log.info('Records:   ' + doc.records);
          log.info('');
          log.info('---------------');
        }
        else {
          log.info('Value:   ' + doc.value);
          log.info('Records: ' + doc.records);
        }
      });
    });
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

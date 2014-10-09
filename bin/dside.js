#!/usr/bin/env node

var util            = require('util');
var log             = require('../lib/log');
var fs              = require('fs');
var program         = require('commander');
var DSide           = require('..');
var bootstrap       = require('../scripts/bootstrap');
var defaultDataDir  = process.env.HOME + '/.dside';
var defaultConfPath = defaultDataDir + '/config.json';

program.version(require('../package').version);

program
  .command('vote')
  .description('submit a key-value record to the network')
  .option('-t, --topic <topic>', 'topic for submitted answer')
  .option('-a, --answer <answer>', 'answer for specified topic')
  .action(function(env) {
    if (!env.topic || !env.answer) {
      return log.error('a topic and answer are required to vote')
    }


  });

program
  .command('consensus')
  .description('retrieve value aggregate for given key')
  .option('-t, --topic <topic>', 'topic for consensus')
  .action(function(env) {
    if (!env.topic) {
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

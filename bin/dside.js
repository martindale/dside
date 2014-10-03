#!/usr/bin/env node

var util    = require('util');
var RPC     = require('../lib/rpc');
var log     = require('../lib/log');
var config  = require(process.env.HOME + '/.dside/config');
var program = require('commander');

program
  .version(require('../package').version)
  .option('-p, --port [port]', config.port)

var client  = new RPC(program.port);

program
  .command('vote')
  .option('-t, --topic <topic>', 'topic for submitted answer')
  .option('-a, --answer <answer>', 'answer for specified topic')
  .action(function(env) {
    if (!env.topic || !env.answer) {
      return log.err('a topic and answer are required to vote')
    }

    client.send(env.topic, env.answer, function(err) {
      if (err) {
        return log.err(err.message);
      }

      log.info('vote submitted');
    });
  });

program
  .command('consensus')
  .option('-t, --topic <topic>', 'topic for consensus')
  .action(function(env) {
    if (!env.topic) {
      return log.err('a topic is required to gain consensus')
    }

    client.read(env.topic, function(err, results) {
      if (err) {
        return log.err(err.message);
      }

      var consensus = {};

      results.forEach(function(vote) {
        if (consensus[vote.answer]) consensus[vote.answer]++
        else consensus[vote.answer] = 1;
      });

      var list = [];

      for (var answer in consensus) {
        list.push({ answer: answer, votes: consensus[answer] });
      }

      list.sort(function(a, b) {
        return b.votes - a.votes;
      });

      list.forEach(function(item) {
        log.info('');
        log.info('\tanswer : ' + item.answer);
        log.info('\tvotes  : ' + item.votes);
        log.info('');
      });
    });
  });

program.parse(process.argv)

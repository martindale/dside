#!/usr/bin/env node

var logo    = require('fs').readFileSync(__dirname + '/../logo.txt');
var config  = require(process.env.HOME + '/.dside/config');
var dside   = require('../');
var program = require('commander');
var log     = require('../lib/log');

program
  .option(
    '-p, --port <port>',
    'listen on custom port'
  )
  .option(
    '-n, --nodes <nodes>',
    'connect to other nodes <hostname1:port1,hostname2:port2,hostname3:port3>'
  );

program.parse(process.argv);

var options = {
  port: Number(program.port) || config.port,
  nodes: config.nodes
};

if (program.nodes) {
  options.nodes = program.nodes.split(',').map(function(n) {
    return { host: n[0], port: n[1] };
  });
}

console.log(require('cli-color').green(logo));

dside.createFullNode(options).init(function(err) {
  if (err) return log.warn(err.message);
});

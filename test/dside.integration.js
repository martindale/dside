var should   = require('should');
var DSide    = require('..');
var Identity = require('../lib/identity');
var async    = require('async');
var fs       = require('fs');
var APP      = process.env.HOME + '/.dside/';

describe('DSide', function() {

  this.timeout(5000);

  var node1, node1, node3;

  var config1 = {
    address: '127.0.0.1',
    port: 8133,
    seeds: [],
    trust: ['*'],
    minPeers: 3,
    maxPeers: 12,
    pingTimeout: 3000,
    storageFile: 'test1.tiny',
    privateKey: require('./data/key1.json').privateKey,
    publicKey: require('./data/key1.json').publicKey
  };

  var config2 = {
    address: '127.0.0.1',
    port: 8134,
    seeds: [{ address: '127.0.0.1', port: 8133 }],
    trust: ['*'],
    minPeers: 3,
    maxPeers: 12,
    pingTimeout: 3000,
    storageFile: 'test2.tiny',
    privateKey: require('./data/key2.json').privateKey,
    publicKey: require('./data/key2.json').publicKey
  };

  var config3 = {
    address: '127.0.0.1',
    port: 8135,
    seeds: [{ address: '127.0.0.1', port: 8134 }],
    trust: ['*'],
    minPeers: 3,
    maxPeers: 12,
    pingTimeout: 3000,
    storageFile: 'test3.tiny',
    privateKey: require('./data/key3.json').privateKey,
    publicKey: require('./data/key3.json').publicKey
  };

  before(function(done) {
    done();
  });

  after(function(done) {
    fs.unlinkSync(APP + 'test1.tiny');
    fs.unlinkSync(APP + 'test2.tiny');
    fs.unlinkSync(APP + 'test3.tiny');
    done();
  });

  describe('#start', function() {

    it('should start the seed node', function(done) {
      node1 = new DSide(config1);
      node1.start();
      done();
    });

    it('should start a node and connect to seed', function(done) {
      node2 = new DSide(config2);
      node2.start();
      node2.node.on('connect', done);
    });

    it('should start a node and connect to new seed', function(done) {
      node3 = new DSide(config3);
      node3.start();
      node3.node.on('connect', done);
    });

  });

  describe('#broadcast', function() {

    it('should send a message to all other nodes', function(done) {
      var recvd = 0;
      node2.once('message', function(msg) {
        should.exist(msg);
        if (++recvd === 2) done();
      });
      node3.once('message', function(msg) {
        should.exist(msg);
        if (++recvd === 2) done();
      });
      node1.broadcast('foo', 'bar');
    });

    it('should receive message from other node', function(done) {
      node1.once('message', function(msg) {
        should.exist(msg);
        done();
      });
      node2.broadcast('bar', 'baz');
    });

  });

});

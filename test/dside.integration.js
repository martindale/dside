var should   = require('should');
var DSide    = require('..');
var Identity = require('../lib/identity');
var Message  = require('../lib/message');
var async    = require('async');
var fs       = require('fs');
var APP      = process.env.HOME + '/.dside/';
var sinon    = require('sinon');

// don't actually forward any ports
DSide.prototype._setupNAT = sinon.stub().callsArg(0);

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
    publicKey: require('./data/key1.json').publicKey,
    rpcPort: 8136
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
    publicKey: require('./data/key2.json').publicKey,
    rpcPort: 8137
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
    publicKey: require('./data/key3.json').publicKey,
    rpcPort: 8138
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
      node1.on('ready', function() {
        node1.start();
        done();
      });
    });

    it('should start a node and connect to seed', function(done) {
      node2 = new DSide(config2);
      node2.on('ready', function() {
        node2.start();
        node2.node.on('connect', done);
      });
    });

    it('should start a node and connect to new seed', function(done) {
      node3 = new DSide(config3);
      node3.on('ready', function() {
        node3.start();
        node3.node.on('connect', done);
      });
    });

  });

  describe('#broadcast', function() {

    var messageKey = null;

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

    it('should store sent messages', function(done) {
      node1.broadcast('foo', 'bar', function(err, msg) {
        should.not.exist(err);
        should.exist(msg);

        messageKey = 'foo::' + msg.data('id');

        node1.store.db.get(messageKey, function(err, doc) {
          should.exist(doc);
          should.exist(doc.body);
          should.exist(doc.pubkey);
          should.exist(doc.signature);
          done();
        });
      });
    });

    it('should store valid received messages', function(done) {
      node2.store.db.get(messageKey, function(err, doc) {
        should.exist(doc);
        should.exist(doc.body);
        should.exist(doc.pubkey);
        should.exist(doc.signature);
        done();
      });
    });

  });

  describe('@store', function() {

    describe('#state', function() {

      it('should stream the database contents properly', function(done) {
        var messages = [];
        var state    = node1.store.state();

        state.pipe(
          new Message.Transporter()
        ).pipe(new Message.Parser()).on('data', function(d) {
          messages.push(d);
        });

        state.on('close', function() {
          messages.should.have.lengthOf(2);
          done();
        });
      });

    });

  });

});

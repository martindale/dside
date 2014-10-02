var dside = require('./');
var node  = dside.createFullNode();

node.init(function() {
  node.client.broadcast('test', 'test');
});

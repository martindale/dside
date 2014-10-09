var HOME  = process.env.HOME;
var APP   = HOME + '/.dside/';
var forge = require('node-forge');
var rsa   = forge.pki.rsa;
var fs    = require('fs');

var Identity = function(keys) {
  var self = this;

  if (keys.pubKey && fs.existsSync(APP + keys.pubKey)) {
    self.publicKeyPEM  = fs.readFileSync(APP + keys.pubKey).toString();
  }
  else {
    self.publicKeyPEM = keys.pubKey;
  }

  if (keys.privKey && fs.existsSync(APP + keys.privKey)) {
    self.privateKeyPEM = fs.readFileSync(APP + keys.privKey).toString();
  }
  else {
    self.privateKeyPEM = keys.privKey;
  }

  self.keypair = {
    privateKey: forge.pki.privateKeyFromPem(self.privateKeyPEM),
    publicKey: forge.pki.publicKeyFromPem(self.publicKeyPEM)
  };
};

Identity.generate = function(callback) {
  // generate an RSA key pair asynchronously
  rsa.generateKeyPair({ bits: 2048 }, function(err, keypair) {
    if (err) return callback(err);
    callback(null, {
      privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
      publicKey: forge.pki.publicKeyToPem(keypair.publicKey)
    });
  });
};

module.exports = Identity;

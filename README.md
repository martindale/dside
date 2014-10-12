DSide
=====

A proof of concept demonstrating decentralized consensus via distributed
key/value store.

## Setup

Install the DSide program globally using Node Package Manager:

```
$ [sudo] npm install -g dside
```

After installation, DSide will create an app directory at `$HOME/.dside` and
generate a public/private RSA key pair that will identify you on the network as
well as create a default configuration file.

You can regenerate your identity and configuration by simply deleting these
files and running:

```
$ dside bootstrap
```

Next, if you want to connect to a known seed, edit your configuration file to
add the seed:

```
$ vim ~/.dside/config.json
```

If you are acting as the first seed, don't worry about this step.

## Usage

Start your node and accept connections from other nodes:

```
$ dside start
```

Leave this process running in one terminal or feel free to background it. From
another terminal, you can interact with your running node via RPC. More details
on commands and options can be found by running:

```
$ dside --help
```

### Submit a Key-Value Pair

In general, DSide is built as a means to distribute a key-value database. To
submit a pair to your local database and propagate it across the network:

```
$ dside submit -k foo -v bar
```

### Recalling a Key-Value Pair

Your record is stored using a special key that proves you are the author to
allow for easy recall and to prevent others from tampering with your data.
Included in each message is your public key and a signature. Your record is
looked up by it's `<key>::<pubkeyhash>`.

The `pubkeyhash` is a base64 encoded SHA-1 hash of your public key. Using the
CLI, you don't need to know this value, since DSide will compute it for you.
Simply run:

```
$ dside recall -k foo
```

And this will return the value you submitted for that key.

### Determining Consensus

A prime use case for a distributed key-value store such as this, is to use the
public record of other's submissions to gain consensus on a given key. This can
be thought of as a sort of "vote" or "poll".

To get the top value for a key along with a list of other values in order of
popularity:

```
$ dside consensus -k foo
```

## Programmatic Example

DSide also exposes itself as a portable module that can be used within your own
application.

```js
// require dside
var DSide = require('dside');

// create a dside node with a config object
var node = new DSide(config);

node.on('ready', function() {
  // start node
  node.start();
});
```

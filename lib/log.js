/*
** dside debug logger
*/

var clr = require('cli-color');

module.exports = {
  info: function(message, data) {
    log('info', message, data);
  },
  warn: function(message, data) {
    log('warning', message, data);
  },
  error: function(message, data) {
    log('error', message, data);
  }
};

function log(type, message, data) {
  if (process.env.NODE_ENV === 'test') return;

  var color = null;

  data = data || '';

  switch (type) {
    case 'error':
      color = 'red';
      break;
    case 'warning':
      color = 'yellow';
      break;
    case 'info':
      color = 'blue';
      break;
    default:
      color = 'green'
  }

  var name   = clr.green('[DSIDE]');
  var prefix = color ? clr.bold[color]('{' + type + '}') : '{' + type + '}';

  console.log(name, prefix, message, data);
};

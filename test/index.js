require('dotenv/config');
const request = require('then-request');

let server = null;

let url = null;
switch (process.argv[2]) {
  case 'local':
    url = 'http://localhost:3000';
    server = require('../server');
    process.env.PIPERMAIL_SOURCE = 'https://mail.mozilla.org/pipermail/es-discuss/';
    break;
  case 'staging':
    url = 'https://esdiscuss-bot-staging.herokuapp.com';
    break;
  case 'prod':
    url = 'https://bot.esdiscuss.org';
    break;
  default:
    console.error('Unrecognised environment ' + process.argv[2]);
    process.exit(1);
    break;
}

const timeout = Date.now() + 10 * 60 * 1000;
function poll() {
  request('GET', url).done(res => {
    if (res.statusCode === 503 && Date.now() < timeout) {
      return poll();
    }
    if (res.statusCode !== 200) {
      console.log(res.body.toString('utf8'));
      process.exit(1);
    } else if (server) {
      process.exit(0);
    }
  });
}
poll();
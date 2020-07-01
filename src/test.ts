import 'dotenv/config';
import {Server} from 'net';
import request from 'then-request';

function getConfig(): {url: string; server: null | Server} {
  switch (process.argv[2]) {
    case 'local':
      process.env.PIPERMAIL_SOURCE =
        'https://mail.mozilla.org/pipermail/es-discuss/';
      return {
        url: 'http://localhost:3000',
        server: require('./server').default,
      };
    case 'prod':
      return {url: 'https://bot.esdiscuss.org', server: null};
    default:
      throw new Error('Unrecognised environment ' + process.argv[2]);
  }
}
const {server, url} = getConfig();

const timeout = Date.now() + 5 * 60 * 1000;
let slow = Date.now() + 1 * 60 * 1000;
function poll() {
  request('GET', url).done((res) => {
    if (res.statusCode === 503 && Date.now() < timeout) {
      if (Date.now() > slow) {
        console.log('status: ' + res.statusCode);
        console.log((res.body as any).toString('utf8'));
        slow = Date.now() + 1 * 60 * 1000;
      }
      return poll();
    }
    if (res.statusCode !== 200) {
      console.log('status: ' + res.statusCode);
      console.log((res.body as any).toString('utf8'));
      process.exit(1);
    } else if (server) {
      process.exit(0);
    }
  });
}
poll();

import {Server} from 'net';
import {createServer} from 'http';
import ms = require('ms');
import Database from './database';
import {getStatus} from './read-pipermail';
import runBot from './';
import {
  monthsToProcess,
  numberOfMessagesToProcessInParallel,
  PIPERMAIL_SOURCE,
  SECRET_DATABASE_URL,
} from './config';
import createConnection from '@databases/pg';

const db = new Database(createConnection(SECRET_DATABASE_URL));

const lastReboot = new Date().toISOString();
let lastRun = 'no old runs to display';
let lastStart = 'never started';
let lastEnd = 'never finished';

function onError(err: Error) {
  console.error(err.stack || err.message || err);
}

async function run() {
  lastStart = new Date().toISOString();

  await runBot({
    source: PIPERMAIL_SOURCE,
    db: db,
    months: monthsToProcess(),
    parallel: numberOfMessagesToProcessInParallel,
    onError: onError,
  });

  lastEnd = new Date().toISOString();
  db.logRun().catch(onError);
}
maintain();
function maintain() {
  run().then(
    () => {
      if (lastEnd != 'never finished') {
        lastRun = ms(
          new Date(lastEnd).getTime() - new Date(lastStart).getTime(),
        );
      }
      setTimeout(maintain, ms('60s'));
    },
    (err: any) => {
      onError(err);
      setTimeout(maintain, ms('60s'));
    },
  );
}

const server: Server = createServer((req, res) => {
  var status = 200;
  if (lastEnd === 'never finished') {
    status = 503;
  } else if (Date.now() - new Date(lastEnd).getTime() > ms('20 minutes')) {
    status = 503;
    onError(new Error('Timeout triggering restart'));
    setTimeout(function () {
      // allow time for the error to be logged
      process.exit(1);
    }, 500);
  }
  res.writeHead(status, {'Content-Type': 'text/plain'});
  var warning =
    status === 503 ? 'WARNING: server behind on processing\n\n' : '';
  var currentRun =
    lastStart > lastEnd ? ms(Date.now() - new Date(lastStart).getTime()) : '-';
  res.end(
    warning +
      `last-reboot:  ${lastReboot}\n` +
      `source:       ${PIPERMAIL_SOURCE}\n` +
      `months:       ${monthsToProcess}\n` +
      `parallelism:  ${numberOfMessagesToProcessInParallel}\n` +
      '\n\n' +
      `last-start:   ${lastStart}\n` +
      `last-end:     ${lastEnd}\n` +
      `pervious-run: ${lastRun}\n` +
      `current-run:  ${currentRun}\n` +
      `status:       ${getStatus()}\n\n` +
      `current-time: ${new Date().toISOString()}`,
  );
}).listen(process.env.PORT || 3000, () => {
  console.log(
    'Server running at http://localhost:' + (process.env.PORT || 3000),
  );
});

export default server;

import {Server} from 'net';
import {createServer} from 'http';
import {Client} from 'raven';
import ms = require('ms');
import Database from './Database';
import {getStatus} from './read-pipermail';
import runBot from './';

function validateEnvVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error('You must specify the "' + name + '" environment variable');
  }
  return value;
}
const PIPERMAIL_SOURCE = validateEnvVariable('PIPERMAIL_SOURCE');

const PIPERMAIL_DATABASE = validateEnvVariable('PIPERMAIL_DATABASE');

const PIPERMAIL_RAVEN = process.env.PIPERMAIL_RAVEN;

const db = new Database(PIPERMAIL_DATABASE);

const settings =
  'last-reboot:  ' +
  new Date().toISOString() +
  '\n' +
  'source:       ' +
  PIPERMAIL_SOURCE +
  '\n' +
  'database:     ' +
  PIPERMAIL_DATABASE.replace(/^.*@/, '');
let lastRun = 'no old runs to display';
let lastStart = 'never started';
let lastEnd = 'never finished';

const ravenClient = PIPERMAIL_RAVEN ? new Client(PIPERMAIL_RAVEN) : null;
if (ravenClient) {
  ravenClient.install();
}
function onError(err: Error) {
  console.error(err.stack || err.message || err);
  if (ravenClient) {
    if (typeof err === 'string') {
      ravenClient.captureMessage(err);
    } else {
      ravenClient.captureException(err);
    }
  }
}

function run() {
  lastStart = new Date().toISOString();
  const defaultMonths =
    process.env.PIPERMAIL_MONTHS || (new Date().getDate() < 5 ? 2 : 1);

  const parallel = process.env.PIPERMAIL_PARALLEL || 1;
  return runBot({
    source: PIPERMAIL_SOURCE,
    db: db,
    months: +defaultMonths,
    parallel: +parallel,
    onError: onError,
  }).then(function() {
    lastEnd = new Date().toISOString();
    db.logRun(new Date(lastStart), new Date(lastEnd)).done(null, onError);
  });
}
maintain();
function maintain() {
  run().done(
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
    setTimeout(function() {
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
      settings +
      '\n\n' +
      'last-start:   ' +
      lastStart +
      '\n' +
      'last-end:     ' +
      lastEnd +
      '\n' +
      'pervious-run: ' +
      lastRun +
      '\n' +
      'current-run:  ' +
      currentRun +
      '\n' +
      'status:       ' +
      getStatus() +
      '\n\n' +
      'current-time: ' +
      new Date().toISOString(),
  );
}).listen(process.env.PORT || 3000, () => {
  console.log(
    'Server running at http://localhost:' + (process.env.PORT || 3000),
  );
});

export default server;

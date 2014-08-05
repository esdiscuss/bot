'use strict';

var ms = require('ms');
var mongojs = require('mongojs');
  var raven = require('raven');
var bot = require('./index.js');

if (!process.env.PIPERMAIL_SOURCE) {
  throw new Error('You must specify the "PIPERMAIL_SOURCE" environment variable');
}
if (!process.env.PIPERMAIL_DATABASE) {
  throw new Error('You must specify the "PIPERMAIL_DATABASE" environment variable');
}

var src = process.env.PIPERMAIL_SOURCE;
var db = mongojs(process.env.PIPERMAIL_DATABASE, ['log', 'headers', 'contents', 'topics']);


var settings = 'last-reboot:  ' + (new Date()).toISOString() + '\n' +
               'source:       ' + src + '\n' +
               'database:     ' + process.env.PIPERMAIL_DATABASE.replace(/^.*@/,'')
var lastRun = 'no old runs to display'
var lastStart = 'never started'
var lastEnd = 'never finished'

var ravenClient = process.env.PIPERMAIL_RAVEN ?
    new raven.Client(process.env.PIPERMAIL_RAVEN) :
    null;
if (ravenClient) {
  ravenClient.patchGlobal();
}
function onError(err) {
  console.error(err.stack || err.message || err);
  if (ravenClient) {
    if (typeof err === 'string') {
      ravenClient.captureMessage(err);
    } else {
      ravenClient.captureError(err);
    }
  }
}

function run() {
  lastStart = (new Date()).toISOString();
  var defaultMonths = process.env.PIPERMAIL_MONTHS || ((new Date()).getDate() < 5 ? 2 : 1);
  var parallel = process.env.PIPERMAIL_PARALLEL || 1
  return bot({
    source: src,
    db: db,
    months: +defaultMonths,
    parallel: +parallel,
    onError: onError
  }).then(function () {
    lastEnd = (new Date()).toISOString()
    if (db) {
      db.log.insert({
        type: 'bot-run',
        start: new Date(lastStart),
        end: new Date(lastEnd)
      }, {safe: true}, function (err) {
        if (err) {
          onError(err)
        }
      })
    }
  });
}
maintain()
function maintain() {
  run().done(function () {
    if (lastEnd != 'never finished') {
      lastRun = ms(new Date(lastEnd).getTime() - new Date(lastStart).getTime());
    }
    setTimeout(maintain, ms('30s'));
  }, function (err) {
    onError(err);
    setTimeout(maintain, ms('30s'));
  })
}

var http = require('http')

http.createServer(function (req, res) {
  var status = 200;
  if (lastEnd === 'never finished') {
    status = 503
  } else if (Date.now() - (new Date(lastEnd)).getTime() > ms('5 minutes')) {
    status = 503
    onError('Timeout triggering restart');
    setTimeout(function () {
      // allow time for the error to be logged
      process.exit(1);
    }, 500);
  }
  res.writeHead(status, {'Content-Type': 'text/plain'})
  var warning = status === 503 ? 'WARNING: server behind on processing\n\n' : ''
  res.end(warning + settings + '\n\n' +
          'last-start:   ' + lastStart + '\n' +
          'last-end:     ' + lastEnd + '\n' +
          'pervious-run: ' + lastRun + '\n\n' +
          'current-time: ' + (new Date()).toISOString());
}).listen(process.env.PORT || 3000);

console.log('Server running at http://localhost:' + (process.env.PORT || 3000));

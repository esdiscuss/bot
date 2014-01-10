var ms = require('ms')
var mongojs = require('mongojs')
var bot = require('./index.js')

var src = process.env.PIPERMAIL_SOURCE || 'https://mail.mozilla.org/pipermail/es-discuss/'
var db = process.env.PIPERMAIL_DATABASE
var connection
if (db) {
  connection = mongojs(db, ['log', 'headers', 'contents', 'topics'])
}

var didSomething = new Date()

var settings = 'last-reboot:  ' + (new Date()).toISOString() + '\n' +
               'source:       ' + src + '\n' +
               'database:     ' + (db || 'no database attached').replace(/^.*@/,'')
var lastRun = 'no old runs to display'
var lastStart = 'never started'
var lastEnd = 'never finished'
var lastMessage = 'no messages processsed yet'

function run() {
  lastStart = (new Date()).toISOString()
  var defaultMonths = (new Date()).getDate() < 5 ? 2 : 1
  didSomething = new Date()
  return bot({source: src, db: connection, months: +(process.env.PIPERMAIL_MONTHS || defaultMonths), parallel: +(process.env.PIPERMAIL_PARALLEL || 1)})
    .on('data', function (message) {
      lastMessage = message.id
      didSomething = new Date()
    })
    .wait()
    .then(function () {
      didSomething = new Date()
      lastEnd = (new Date()).toISOString()
      if (connection) {
        connection.log.insert({
          type: 'bot-run',
          start: new Date(lastStart),
          end: new Date(lastEnd)
        }, {safe: true}, function (err) {
          if (err) {
            console.error(err.stack || err.message || err)
          }
        })
      }
    })
}
maintain()
function maintain() {
  run().done(function () {
    if (lastEnd != 'never finished') {
      lastRun = lastStart + ' to ' + lastEnd
    }
    setTimeout(maintain, 30 * 1000)
  }, maintain)
}

var http = require('http')

http.createServer(function (req, res) {
  var status = 200;
  if (lastEnd === 'never finished') {
    status = 503
  } else if (Date.now() - (new Date(lastEnd)).getTime() > ms('5 minutes')) {
    status = 503
  }
  res.writeHead(status, {'Content-Type': 'text/plain'})
  var warning = status === 503 ? 'WARNING: server behind on processing\n\n' : ''
  res.end(warning + settings + '\n\n' +
          'last-start:   ' + lastStart + '\n' +
          'last-end:     ' + lastEnd + '\n' +
          'last-message: ' + lastMessage + '\n' +
          'pervious-run: ' + lastRun + '\n\n' +
          'current-time: ' + (new Date()).toISOString())

  if ((lastEnd !== 'never finished' && timeSpan(lastEnd, '5 minutes')) || timeSpan(didSomething, '10 minutes')) {
    console.log('It\'s been way too long...rebooting.')
    process.exit(1)
  }
}).listen(3000)
function timeSpan(time, span) {
  var now = new Date()
  if (typeof time === 'string') time = new Date(time)
  return now.getTime() - time.getTime() > ms(span.toString())
}

console.log('Server running at http://localhost:3000/');
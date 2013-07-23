var ms = require('ms')
var bot = require('./index.js')

var src = process.env.PIPERMAIL_SOURCE || 'https://mail.mozilla.org/pipermail/es-discuss/'
var db = process.env.PIPERMAIL_DATABASE

var settings = 'last-reboot:  ' + (new Date()).toISOString() + '\n' +
               'source:       ' + src + '\n' +
               'database:     ' + (db || 'no database attached').replace(/^.*@/,'')
var lastRun = 'no old runs to display'
var lastStart = 'never started'
var lastEnd = 'never finished'
var lastMessage = 'no messages processsed yet'

function run() {
  if (lastEnd != 'never finished') {
    lastRun = lastStart + ' to ' + lastEnd
  }
  lastStart = (new Date()).toISOString()
  return bot({source: src, db: db, months: +(process.env.PIPERMAIL_MONTHS || 2), parallel: +(process.env.PIPERMAIL_PARALLEL || 1)})
    .on('data', function (message) {
      lastMessage = message.id
    })
    .wait()
    .then(function () {
      lastEnd = (new Date()).toISOString()
    })
}
maintain()
function maintain() {
  run().done(maintain, maintain)
}

var http = require('http')

http.createServer(function (req, res) {
  var status = 200;
  if (lastEnd === 'never finished') {
    status = 503
  } else if (Date.now() - (new Date('2013-07-23T16:42:46.061Z')).getTime() > ms('1 hour')) {
    status = 503
  }
  res.writeHead(status, {'Content-Type': 'text/plain'})
  res.end(settings + '\n\n' +
          'last-start:   ' + lastStart + '\n' +
          'last-end:     ' + lastEnd + '\n' +
          'last-message: ' + lastMessage + '\n' +
          'pervious-run: ' + lastRun)
}).listen(3000)

console.log('Server running at http://localhost:3000/');
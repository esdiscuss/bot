var ms = require('ms')
var bot = require('./index.js')

var src = process.env.PIPERMAIL_SOURCE || 'https://mail.mozilla.org/pipermail/es-discuss/'
var db = process.env.PIPERMAIL_DATABASE

var didSomething = new Date()

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
      didSomething = new Date()
    })
    .wait()
    .then(function () {
      didSomething = new Date()
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
  } else if (Date.now() - (new Date(lastEnd)).getTime() > ms('1 hour')) {
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

  if (Date.now() - didSomething.getTime() > ms('10 minutes')) {
    console.log('It\'s been too long...rebooting.')
    process.exit(1)
  }
}).listen(3000)

console.log('Server running at http://localhost:3000/');
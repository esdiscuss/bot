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
  return bot({source: src, db: db})
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
  res.writeHead(200, {'Content-Type': 'text/plain'})
  res.end(settings + '\n\n' +
          'last-start:   ' + lastStart + '\n' +
          'last-end:     ' + lastEnd + '\n' +
          'last-message: ' + lastMessage + '\n' +
          'pervious-run: ' + lastRun)
}).listen(3000)

console.log('Server running at http://localhost:3000/');
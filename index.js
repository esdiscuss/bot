var pipermail = require('pipermail')
var barrage = require('barrage')
var filter = require('./lib/filter')
var writeMongo = require('./lib/write-mongo')

module.exports = messages
function messages(options) {
  options = options || {}
  var source = options.source || 'https://mail.mozilla.org/pipermail/es-discuss/'
  source = source.replace(/([^\/])\/?$/g, '$1/')
  var dryRun = options['dry-run'] || options.dryRun
  var db = options.db || null

  var stream = barrage(pipermail(source), true).pipe(filter())

  if (db && !dryRun) {
    stream = stream.syphon(writeMongo(db))
  }

  return stream;
}
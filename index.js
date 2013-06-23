var pipermail = require('pipermail');
var filter = require('./lib/filter');
var after = require('./lib/after');
var writeMongo = require('./lib/write-mongo');

exports = (module.exports = messages);
exports.messages = messages;
function messages(options) {
  var source = options.source || 'https://mail.mozilla.org/pipermail/es-discuss/';
  source = source.replace(/\/?$/g, '/');
  var age = options.age;
  var dryRun = options['dry-run'] || options.dryRun;
  var db = options.db || null;

  var stream = pipermail(source).pipe(filter());

  if (age) {
    stream.on('error', error);
    stream = stream.pipe(after(age));
  }

  if (db && !dryRun) {
    stream.on('error', error);
    stream = stream.pipe(writeMongo(db));
  }

  function error(err) {
    stream.emit('error', err);
  }

  return stream;
}
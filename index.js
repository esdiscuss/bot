var pipermail = require('pipermail');
var filters = require('./lib/pipermail-filters');
var writeGitHub = require('./lib/write-github');
var writeMongo = require('./lib/write-mongo');

exports = (module.exports = messages);
exports.messages = messages;
function messages(options) {
  var source = options.source || 'https://mail.mozilla.org/pipermail/es-discuss/';
  source = source.replace(/\/?$/g, '/');
  var age = options.age;
  var organisation = options.organisation;
  var dryRun = options['dry-run'] || options.dryRun;
  var db = options.db || null;

  var stream = pipermail(source, {progress: options.progress || false, cache: options.cache !== false, gzip: options.gzip || false}).pipe(filters());

  if (age) {
    stream.on('error', error);
    stream = stream.pipe(filters.after(age));
  }

  if (db && !dryRun) {
    stream.on('error', error);
    stream = stream.pipe(writeMongo(db));
  }

  if (organisation) {
    stream.on('error', error);
    stream = stream.pipe(filters.notExists(organisation));
  }

  if (options.user && options.pass && !dryRun) {
    stream.on('error', error);
    stream = stream
      .pipe(writeGitHub({
          user: {type: 'basic', username: options.user, password: options.pass},
          organisation: organisation,
          team: options.team
        }));
  }

  function error(err) {
    stream.emit('error', err);
  }

  return stream;
}
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

  var stream = pipermail(source, {progress: false, cache: true}).pipe(filters());

  if (age) stream = stream.pipe(filters.after(age));

  if (db && !dryRun) {
    stream = stream.pipe(writeMongo(db));
  }

  if (organisation) stream = stream.pipe(filters.notExists(organisation));

  if (options.user && options.password && !dryRun) {
    stream = stream
      .pipe(writeGitHub({
          user: {type: 'basic', username: options.user, password: options.pass},
          organisation: organisation,
          team: options.team
        }));
  }

  return stream;
}
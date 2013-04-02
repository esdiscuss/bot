var pipermail = require('pipermail');
var filters = require('./lib/pipermail-filters');
var output = require('./lib/pipermail-output');

module.exports = execute;
function execute(options) {
  var source = options.source || 'https://mail.mozilla.org/pipermail/es-discuss/';
  source = source.replace(/\/?$/g, '/');
  var age = options.age;
  var organisation = options.organisation;
  var dryRun = options['dry-run'] || options.dryRun;

  var stream = pipermail(source, {progress: false, cache: true})
    .pipe(filters.spam())
    .pipe(filters.fixSubjects())
    .pipe(filters.fixDates())
    .pipe(filters.fixID());

  if (age) stream = stream.pipe(filters.after(age));

  if (organisation) stream = stream.pipe(filters.notExists(organisation));

  if (!dryRun) {
    stream = stream
      .pipe(require('./lib/pipermail-output')({
          user: {type: 'basic', username: options.user, password: options.pass},
          organisation: organisation,
          team: options.team
        }));
  }

  return stream;
}
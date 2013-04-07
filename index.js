var pipermail = require('pipermail');
var filters = require('./lib/pipermail-filters');
var output = require('./lib/pipermail-output');

exports = (module.exports = messages);
exports.messages = messages;
function messages(options) {
  var source = options.source || 'https://mail.mozilla.org/pipermail/es-discuss/';
  source = source.replace(/\/?$/g, '/');
  var age = options.age;
  var organisation = options.organisation;
  var dryRun = options['dry-run'] || options.dryRun;

  var stream = pipermail(source, {progress: false, cache: true}).pipe(filters());

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

//{id, subject, count, original-from: 'foo@bar.com', latest-from: 'foo@bar.com', start, end}
//{
//  $set: { id, subject },
//  $inc: { count },
//  $setOnInsert: { start, original-from, end, latest-from }
//}

var mongojs = require('mongojs');
// { _id: path, subjectID, subject, date, from }
function topics(options) {
  var source = options.source || 'https://mail.mozilla.org/pipermail/es-discuss/';
  var db = mongojs(options.db, ['messages', 'topics']);

  var running = 0;
  var stream = pipermail(source, {progress: false, cache: true}).pipe(filters());
    .pipe(through(function (message) {
      if (running++ === 0) this.pause();
      db.messages.create({
        _id: message.path,
        subjectID: tag(message.header.subject)
      }, function (err) {
        console.error(err.stack || err.message || err);
        if (--running === 0) this.resume();
      });
    }));
  stream.on('error', function (e) {
    console.error(e.stack || e.message || e);
  });
}
function tag(subject) {
  return subject.replace(/[^a-z]+/gi, '').replace(/fwd?/gi, '').replace(/re/gi, '');
}
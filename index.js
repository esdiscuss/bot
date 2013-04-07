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

var through = require('through');
function topics(options) {
  var source = options.source || 'https://mail.mozilla.org/pipermail/es-discuss/';
  var db = mongojs(options.db, ['messages', 'topics']);

  var running = 0;
  var stream = pipermail(source, {progress: false, cache: true})
    .pipe(filters())
    .pipe(through())
    .pipe(through(function (message) {
      var self = this;
      console.warn('start: ' + message.path);
      if (5 === running++) self.pause();
      var meta = {};
      Object.keys(message.header)
        .forEach(function (key) {
          meta[key] = message.header[key];
        });
      meta._id = message.path;
      meta.subjectID = message.subjectID;
      meta.month = message.month;
      meta.id = message.id;
      //console.dir(meta);
      db.messages.insert(meta, {safe: true}, function (err) {
        if (err && err.code != 11000) { //if error and not "document already exists"
          console.error(err.stack || err.message || err);
          console.dir(err);
        }
        else console.warn('end: ' + message.path);
        if (--running === 5) self.resume();
      });
    }));
  stream.on('error', function (e) {
    console.error(e.stack || e.message || e);
  });
}
//esdiscuss
//c59d0cf0-520e-4198-a41d-5819eef1cab8
topics(require('./bin/settings.json'));

function tag(subject) {
  return subject.replace(/[^a-z]+/gi, '').replace(/fwd?/gi, '').replace(/re/gi, '');
}
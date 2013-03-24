var pipermail = require('pipermail');

var user = process.argv[2];
var pass = process.argv[3];
if ((user && !pass) || user === '-h' || user === '--help' || user === '-?' || user === '/?') {
  console.warn('Usage:');
  console.warn();
  console.warn('  To scan for new messages without commiting:');
  console.warn();
  console.warn('    esdiscuss-bot');
  console.warn();
  console.warn('  To commit new messages:');
  console.warn();
  console.warn('    esdiscuss-bot user password');
  process.exit((user && !pass) ? 2 : 0);
}
var stream = pipermail('https://mail.mozilla.org/pipermail/es-discuss/', 
    {progress: false, cache: true})
  .pipe(require('./lib/pipermail-filters').spam())
  .pipe(require('./lib/pipermail-filters').fixSubjects())
  .pipe(require('./lib/pipermail-filters').fixDates())
  .pipe(require('./lib/pipermail-filters').after('40 days'))
  .pipe(require('./lib/pipermail-filters').notExists());

if (user && pass) {
  stream = stream
    .pipe(require('./lib/pipermail-output')({
        user: {type: 'basic', username: user, password: pass},
        organisation: 'esdiscuss',
        team: '337802'
      }));
}

stream.pipe(jsonify())
      .pipe(process.stdout);

function jsonify() {
  return require('through')(function (message) {
    this.queue(JSON.stringify(message.header) + '\n');
  })
}

function stringify() {
  return require('through')(function (message) {
    var date = normaliseDate(message.header.date);
    var messageID = message.header.messageID.replace(/\</g, '').replace(/\>/g, '');
    var path = 'https://raw.github.com/esdiscuss/' + date + '/master/' + encodeURIComponent(messageID);
    this.queue(path + '/header.json' + '\n\n');
  })
}

function normaliseDate(date) {
  var month = '' + (date.getMonth() + 1);
  if (month.length === 1) month = '0' + month;
  return date.getFullYear() + '-' + month;
}

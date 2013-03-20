var pipermail = require('pipermail');

var stream = pipermail('https://mail.mozilla.org/pipermail/es-discuss/', 
    {progress: false, cache: true})
  .pipe(require('./lib/pipermail-filters').spam())
  .pipe(require('./lib/pipermail-filters').fixSubjects())
  .pipe(require('./lib/pipermail-filters').fixDates())
  .pipe(require('./lib/pipermail-filters').after('40 days'))
  .pipe(require('./lib/pipermail-filters').notExists())
  .pipe(require('./lib/pipermail-output')({
      user: {type: 'basic', username: 'user', password: 'password'},
      organisation: 'esdiscuss',
      team: '337802'
    }))
//  .pipe(stringify())
  .pipe(process.stdout);
//stream.on('error', def.reject.bind(def));
//stream.on('end', def.resolve.bind(def, null));

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

var through = require('through');
var removeDiacritics = require('./rm-diatrics');

module.exports = fix;

exports.after = require('./after');
exports.notExists = require('./not-exists');

function fix() {
  var subjects = {};
  var convoIDs = {};
  return through(function (message) {
    //filter spam
    if (!/spam/i.test(message.header.subject) &&
        !/no subject/i.test(message.header.subject)) {

      //fix ids
      message.id = removeDiacritics(message.header.messageID).replace(/[^\_\=\@\$\+\%\-\.\+0-9a-zA-Z]+/g, '');

      //fix dates
      message.header.date = new Date(message.header.date);
      var year = '' + message.header.date.getFullYear();
      var month = '' + (message.header.date.getMonth() + 1);
      if (month.length === 1) month = '0' + month;
      message.month = year + '-' + month;

      //add message path
      message.path = message.month + '/' + message.id;

      //fix subjects
      var subjectTag = tag(message.header.subject);
      var subject = convoIDs['key:' + message.header.inReplyTo] || subjects['key:' + subjectTag] || message.header.subject;
      message.header.subject = subject;
      convoIDs['key:' + message.header.messageID] = subject;
      subjects['key:' + subjectTag] = message.header.subject;

      this.queue(message);
    }
  });
  function tag(subject) {
    return subject.replace(/[^a-z]+/gi, '').replace(/fwd?/gi, '').replace(/re/gi, '');
  }
}
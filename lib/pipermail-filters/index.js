var through = require('through');

exports.spam = require('./spam');
exports.fixSubjects = require('./fix-subjects');
exports.fixDates = require('./fix-dates');
exports.after = require('./after');
exports.notExists = require('./not-exists');

exports.selectSubject = selectSubject;
function selectSubject() {
  return through(function (item) {
    this.queue([item.header.messageID, item.header.subject]);
  });
}

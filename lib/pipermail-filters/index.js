var through = require('through');
var removeDiacritics = require('./rm-diatrics');

exports.spam = require('./spam');
exports.fixSubjects = require('./fix-subjects');
exports.fixDates = require('./fix-dates');
exports.after = require('./after');
exports.notExists = require('./not-exists');


exports.fixID = fixID;
function fixID() {
  return through(function (message) {
    message.id = removeDiacritics(message.header.messageID).replace(/[^\_\=\@\$\+\%\-\.\+0-9a-zA-Z]+/g, '');
    this.queue(message);
  });
}

exports.selectSubject = selectSubject;
function selectSubject() {
  return through(function (item) {
    this.queue([item.header.messageID, item.header.subject]);
  });
}
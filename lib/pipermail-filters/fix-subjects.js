var through = require('through');

module.exports = fixSubjects;
function fixSubjects() {
  var subjects = {};
  var convoIDs = {};
  return through(function (item) {
    item.header.subject =
      (convoIDs[item.header.messageID] =
      convoIDs[item.header.inReplyTo] ||
      subjects[tag(item.header.subject)] ||
      (subjects[tag(item.header.subject)] = item.header.subject));
    this.queue(item);
  });
  function tag(subject) {
    return subject.replace(/[^a-z]+/gi, '').replace(/fwd?/gi, '').replace(/re/gi, '');
  }
}
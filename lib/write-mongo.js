var mongojs = require('mongojs');
var through = require('through');

module.exports = outputToMongo;
function outputToMongo(db) {
  db = mongojs(db, ['messages']);

  var ended = false;
  var running = 0;

  return through(function (message) {
    var self = this;
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
    db.messages.insert(meta, {safe: true}, function (err) {
      if (err && err.code != 11000) { //if error and not "document already exists"
        self.emit('error', err);
      }
      self.queue(message);
      if (--running === 5) self.resume();
      if (running === 0 && ended) db.close();
    });
  }, function () {
    if (running) {
      ended = true;
    } else {
      db.close();
    }
  });
}
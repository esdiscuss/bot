var Q = require('q');
var mongojs = require('mongojs');
var through = require('./throttle')(2, 'mongo');

module.exports = outputToMongo;
function outputToMongo(db) {
  db = mongojs(db, ['messages']);

  return through(function (message) {
    var self = this;
    var meta = {};
    Object.keys(message.header)
      .forEach(function (key) {
        meta[key] = message.header[key];
      });
    meta._id = message.path;
    meta.subjectID = message.subjectID;
    meta.month = message.month;
    meta.id = message.id;
    return Q.promise(function (resolve) {
      db.messages.insert(meta, {safe: true}, function (err) {
        if (err && err.code != 11000) { //if error and not "document already exists"
          self.emit('error', err);
        }
        self.queue(message);
        resolve(null);
      });
    });
  }, function () {
    console.warn('MONGO_END');
    db.close();
    this.queue(null);
  });
}
var through = require('./throttle')(1);
var GitHub = new require('./github');
var Q = require('q');
require('./fix-json');

module.exports = outputToGitHub;
function outputToGitHub(settings) {
  var client = new GitHub(settings);
  var commits = {};
  var commitsToPush = [];
  var i = 0;

  return through(function (message) {
    var self = this;

    var messageID = message.id;
    var date = message.month;

    return client.createRepo(date)
      .then(function (exists) {
        var commit = commits[date];
        if (!commit) {
          commit = commits[date] = client.createCommit(date);
          commitsToPush.push(commit);
        }

        return commit.addFiles([
          {
            path: messageID + '/original.md',
            content: message.body
          },
          {
            path: messageID + '/edited.md',
            content: message.body
          }]);
      })
      .timeout(600000)
      .then(function () {
        self.queue(message);
      }, function (err) {
        console.error(err.stack || err.message || err);
      });
  }, function () {
    console.warn('GITHUB_END');
    var self = this;
    var current = Q.resolve(null);
    commitsToPush.forEach(function (commit) {
      current = current.then(function () {
        return commit.complete('Add Messages');
      });
    });
    current
      .done(function () {
        self.queue(null);
      }, function (err) {
        console.error(err.stack || err.message || err);
        self.queue(null);
      });
  });
}
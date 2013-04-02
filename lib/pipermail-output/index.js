var through = require('through');
var GitHub = new require('./github');
var Q = require('q');

module.exports = outputToGitHub;
function outputToGitHub(settings) {
  var client = new GitHub(settings);
  var commits = {};
  var commitsToPush = [];
  var i = 0;

  var inProgress = 0;

  return through(function (item) {
    var self = this;

    if (inProgress === 0) self.pause();
    inProgress++

    var date = normaliseDate(item.header.date);

    var messageID = item.id;
    //console.log(date + '/' + messageID);
    client.createRepo(date)
      .then(function (exists) {
        var commit = commits[date];
        if (!commit) {
          commit = commits[date] = client.createCommit(date);
          commitsToPush.push(commit);
        }

        return commit.addFiles([
          {
            path: messageID + '/header.json',
            content: JSON.stringify(item.header, null, 2)
          },
          {
            path: messageID + '/original.md',
            content: item.body
          },
          {
            path: messageID + '/edited.md',
            content: item.body
          }]);
      })
      .timeout(600000)
      .done(function () {
        self.queue(item);
        if (0 === --inProgress) self.resume();
      }, function (err) {
        console.error(err.stack || err.message || err);
        if (0 === --inProgress) self.resume();
      });
  }, function (finish) {
    var self = this;
    checkForFinish();
    function checkForFinish() {
      if (inProgress) return setTimeout(checkForFinish, 100);
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
    }

  }, true);
}

function normaliseDate(date) {
  var month = '' + (date.getMonth() + 1);
  if (month.length === 1) month = '0' + month;
  return date.getFullYear() + '-' + month;
}
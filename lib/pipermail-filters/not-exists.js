var Q = require('q');
var through = require('through');
var request = require('request');

module.exports = notExistsStream;

function notExistsStream() {
  var inProgress = 0;
  var ended = false;
  return through(function (message) {
    var self = this;
    if (inProgress === 0) self.pause();
    inProgress++;

    var date = normaliseDate(message.header.date);
    var messageID = message.header.messageID.replace(/\</g, '').replace(/\>/g, '');

    exists(date, messageID)
      .done(function (exists) {
        if (!exists) self.queue(message);
        if (0 === --inProgress) self.resume();
        if (ended && inProgress === 0) self.queue(null);
      });
  }, function () {
    if (inProgress === 0) this.queue(null);
    else ended = true;
  });
}

function exists(date, message) {
  var self = this;
  var path = 'https://raw.github.com/esdiscuss/'
          + date + '/master/'
          + encodeURIComponent(message);
  return pathExists(path + '/header.json')
    .then(function (exists) {
      return exists || pathExists(path + '/edited.md');
    })
    .then(function (exists) {
      return exists || pathExists(path + '/original.md');
    })
};

function pathExists(path) {
  function exists() {
    return Q.nfcall(request.head, path)
      .spread(function (res) {
        if (res.statusCode != 200 && res.statusCode != 404) {
          throw error(path, res);
        } else if (res.statusCode === 404) {
          return false;
        } else {
          return true;
        }
      });
  }
  return retry(exists, 5, 0, path);
}

function error(path, res) {
  return new Error('Server responded with ' + res.statusCode + ' to ' + JSON.stringify(path));
}

function retry(fn, attempts, delay, name) {
  delay = delay || 0;
  return attempts < 2 ? fn() : (fn()
    .fail(function () {
      console.log('retrying ' + name + ': ' + (delay + 1));
      return Q.delay(Math.pow(2, delay) * 1000)
        .then(function () {
          return retry(fn, attempts - 1, delay + 1);
        });
    }))
}

function normaliseDate(date) {
  var month = '' + (date.getMonth() + 1);
  if (month.length === 1) month = '0' + month;
  return date.getFullYear() + '-' + month;
}

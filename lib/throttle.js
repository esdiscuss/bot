var through = require('through');
var Q = require('q');
var once = require('once');

module.exports = throttle;
function throttle(concurrency) {
  return function (data, end) {
    end = once(end);
    var inProgress = 0;
    var paused = false;
    var finished = false;

    var res = through(onData, onEnd);
    var _resume = res.resume.bind(res);
    var _pause = res.pause.bind(res);
    var reallyPaused = false;
    function resume() {
      if (!reallyPaused) return;
      reallyPaused = false;
      _resume();
    }
    function pause() {
      if (reallyPaused) return;
      reallyPaused = true;
      _pause();
    }

    res.pause = function () {
      paused = true;
      pause();
    }
    res.resume = function () {
      paused = false;
      if (inProgress < concurrency) resume();
    }

    function onData(chunk) {
      var self = this;
      var res = data.call(self, chunk);
      if (res && typeof res.then === 'function') {
        res = Q(res);
        inProgress++;
        if (inProgress >= concurrency && !paused) {
          pause();
        }
        res.done(function () {
          inProgress--;
          if (inProgress < concurrency && !paused) resume();
          if (finished) end.call(self);
        }, function (err) {
          self.emit('error', err);
          inProgress--;
          if (inProgress < concurrency && !paused) resume();
          if (finished) end.call(self);
        });
      }
    }
    function onEnd() {
      finished = true;
      if (inProgress === 0) end.call(this);
    }

    res.resume = function () {
      if (!inProgress) return resume();
    }
    return res;
  }
}
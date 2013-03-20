var through = require('through');
var ms = require('ms');

module.exports = after;
function after(timespan) {
  var minimum = Date.now() - (typeof timespan === 'string' ? ms(timespan) : timespan);
  if (typeof minimum != 'number' || isNaN(minimum)) throw new TypeError('timespan must be a number');
  minimum = new Date(minimum);
  return through(function (message) {
    if (message.header.date > minimum) {
      this.queue(message);
    }
  })
}
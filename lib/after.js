var Transform = require('stream').Transform || require('readable-stream').Transform

var ms = require('ms')

module.exports = after;
function after(timespan) {
  var minimum = Date.now() - (typeof timespan === 'string' ? ms(timespan) : timespan);
  if (typeof minimum != 'number' || isNaN(minimum)) throw new TypeError('timespan must be a number');
  minimum = new Date(minimum);
  var stream = new Transform({objectMode: true})
  stream._transform = function (message, _, callback) {
    if (message.header.date > minimum) {
      this.push(message);
    }
    callback()
  }
  return stream
}
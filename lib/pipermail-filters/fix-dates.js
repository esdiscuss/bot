var through = require('through');

module.exports = fixDates;
function fixDates() {
  return through(function (item) {
    item.header.date = new Date(item.header.date);
    this.queue(item);
  });
}
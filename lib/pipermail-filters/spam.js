var through = require('through');

module.exports = spam;
function spam() {
  return through(function (item) {
    if (!/spam/i.test(item.header.subject) &&
        !/no subject/i.test(item.header.subject)) {
      this.queue(item);
    }
  });
}
var crypto = require('crypto')
var Transform = require('stream').Transform || require('readable-stream').Transform

exports = (module.exports = fix)

// adds {id, month, path, subjectID}
function fix() {
  var stream = new Transform({objectMode: true})
  stream._transform = function (message, _, callback) {
    //filter spam
    if (!/spam/i.test(message.header.subject) && !/no subject/i.test(message.header.subject)) {
      message.url = message.url.replace(/\/+([^\/]+)\/+([^\/]+)\/+([^\/]+)\/+([^\/]+)$/, '/$1/$2/$3/$4')
      message.id = message.url.replace()
      message.subjectID = tag(message.header.subject)
      this.push(message)
    }
    callback()
  }
  return stream
}

function tag(subject) {
  return subject.replace(/[^a-z]+/gi, '').replace(/fwd?/gi, '').replace(/re/gi, '').toLowerCase()
}
function md5(str) {
  return crypto.createHash('md5').update(str).digest("hex").toLowerCase()
}
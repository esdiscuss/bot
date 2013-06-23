var Q = require('q')
var mongojs = require('mongojs')
var Transform = require('stream').Transform || require('readable-stream').Transform

module.exports = outputToMongo;
function outputToMongo(db) {
  db = mongojs(db, ['headers', 'contents', 'topics'])
  var stream = new Transform({objectMode: true})
  stream._transform = function (message, _, callback) {
    message.header._id = message.id
    message.header.subjectID = message.subjectID
    var remaining = 2
    console.dir(message.header.date.toUTCString())
    db.headers.insert(message.header, {safe: true}, function (err) {
      if (err && err.code != 11000) { //if error and not "document already exists"
        return callback(err)
      }
      if (0 === --remaining) {
        //this.push(message)
        callback()
      }
    })
    db.contents.insert({
      _id: message.id,
      subjectID: message.subjectID,
      content: message.body
    }, {safe: true}, function (err) {
      if (err && err.code != 11000) { //if error and not "document already exists"
        return callback(err)
      }
      if (0 === --remaining) {
        //this.push(message)
        callback()
      }
    })
  }
  stream._end = function (callback) {
    db.headers.aggregate({ '$sort': { date: 1 } },{'$group': {
      _id: "$subjectID",
      subject: { '$first': '$subject'},
      messages: {'$sum': 1},
      first: { '$first': '$from' },
      last: { '$last': '$from' },
      start: { '$first': '$date' },
      end: { '$last': '$date' }
    }}, function (err, topics) {
      if (err) return callback(err)
      topics.forEach(function (topic) {
        topic.subjectID = topic._id
        topic._id = slug(topic.subject)
        db.topics.insert(topic, {safe: true}, function (err) {
          if (err && err.code != 11000) { //if error and not "document already exists"
            return callback(err)
          }
        })
      })
    })
  }
  stream._end(function () {})
  return stream
}

function slug(subject) {
  return subject.replace(/[^a-z0-9\. ]+/gi, '').trim().replace(/ /g, '-').replace(/\-+/g, '-').toLowerCase()
}
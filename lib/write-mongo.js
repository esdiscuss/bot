var mongojs = require('mongojs')
var Transform = require('barrage').Transform
var slug = require('slugg')

module.exports = outputToMongo
function outputToMongo(db) {
  var stream = new Transform({objectMode: true})
  var writtenSomething = false
  stream._transform = function (message, _, callback) {
    writtenSomething = true
    message.header._id = message.id
    message.header.subjectID = message.subjectID
    message.header.url = message.url
    var remaining = 2
    db.headers.insert(message.header, {safe: true}, function (err) {
      if (err && err.code != 11000) { //if error and not "document already exists"
        return callback(err)
      }
      if (0 === --remaining) {
        stream.push(message)
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
        stream.push(message)
        callback()
      }
    })
  }
  stream._flush = function (callback) {
    if (writtenSomething) {
      writeTopics(db, callback)
    }
  }
  return stream
}

module.exports.writeTopics = writeTopics
function writeTopics(db, callback) {
  if (typeof db === 'string') db = mongojs(db, ['headers', 'contents', 'topics'])
  db.headers.aggregate(
  {
    '$sort': { date: 1 }
  },
  {
    '$group': {
      _id: "$subjectID",
      subject: { '$first': '$subject'},
      messages: {'$sum': 1},
      first: { '$first': '$from' },
      last: { '$last': '$from' },
      start: { '$first': '$date' },
      end: { '$last': '$date' }
    }
  }, function (err, topics) {
    if (err) return callback(err)
    var remaining = topics.length
    if (remaining === 0) return callback()
    topics.forEach(function (topic) {
      topic.subjectID = topic._id
      topic._id = slug(topic.subject)
      db.topics.update({_id: topic._id}, topic, {upsert: true}, function (err) {
        if (err) return callback(err)
        if (0 === --remaining) return callback()
      })
    })
  })
}
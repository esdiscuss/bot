'use strict'

var assert = require('assert')
var pipermail = require('pipermail')
var mongojs = require('mongojs')
var Promise = require('promise')
var writeMongo = require('./lib/write-mongo')

module.exports = messages
function messages(options) {
  options = options || {}
  var source = options.source || 'https://mail.mozilla.org/pipermail/es-discuss/'
  source = source.replace(/([^\/])\/?$/g, '$1/')
  var dryRun = options['dry-run'] || options.dryRun
  var db = options.db || null
  var dbAsString = typeof db === 'string';
  if (db) {
    if (dbAsString)
      db = mongojs(db, ['headers', 'contents', 'topics'])
    options.filterMessage = function (url) {
      return new Promise(function (resolve, reject) {
        db.headers.findOne({url: url}, function (err, res) {
          if (err || res === null) return resolve(true)
          db.contents.findOne({_id: res._id}, function (err, res) {
            if (err || res === null) return resolve(true)
            return resolve(false)
          })
        })
      })
    }
  }

  var stream = pipermail(source, options).filter(function (message) {
    //filter spam
    if (/spam/i.test(message.header.subject) || /no subject/i.test(message.header.subject)) {
      return false
    }
    // update/add some extra properties
    message.url = message.url.replace(/\/+([^\/]+)\/+([^\/]+)\/+([^\/]+)\/+([^\/]+)$/, '/$1/$2/$3/$4')
    message.id = message.header.date.toISOString() + '-' + message.header.from.email.replace(/@/g, '.')
    message.subjectID = tag(message.header.subject)
    return true
  })

  if (db && !dryRun) {
    stream = stream.syphon(writeMongo(db, options))
  }

  var closed = false
  function onEnd() {
    if (closed) return
    closed = true
    db.close()
  }
  if (dbAsString) {
    stream.once('end', onEnd)
  }

  return stream;
}

function tag(subject) {
  return subject.replace(/[^a-z]+/gi, '').replace(/fwd?/gi, '').replace(/re/gi, '').toLowerCase()
}
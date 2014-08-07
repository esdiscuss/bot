'use strict';

var assert = require('assert')
var pipermail = require('pipermail')
var Promise = require('promise')

var status = '';
module.exports = messages
module.exports.getStatus = function () {
  return status;
};
function messages(options) {
  var source = options.source
  source = source.replace(/([^\/])\/?$/g, '$1/')
  var db = options.db
  options.filterMessage = function (url) {
    var start = Date.now();
    return new Promise(function (resolve, reject) {
      db.headers.findOne({url: url}, function (err, res) {
        if (err || res === null) {
          if (err) options.onError(err)
          return resolve(true)
        }
        db.contents.find({_id: res._id}).count(function (err, res) {
          if (err || res !== 1) {
            if (err) options.onError(err)
            return resolve(true)
          }
          return resolve(false)
        })
      })
    }).then(function (result) {
      var end = Date.now();
      status = url + ' ' + (end - start) + 'ms ' + JSON.stringify(result);
      return result;
    });
  }

  // options.cache = 'file';

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

  return stream
}

function tag(subject) {
  return subject.replace(/[^a-z]+/gi, '')
                .replace(/fwd?/gi, '')
                .replace(/re/gi, '')
                .toLowerCase()
}

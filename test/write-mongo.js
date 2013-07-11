var fs = require('fs')
var assert = require('assert')
var filter = require('../lib/filter')
var writeMongo = require('../lib/write-mongo')

describe('writeMongo', function () {
  var fheader = true
  var fcontents = true
  var headers = []
  var contents = []
  var aggregate
  var topics = []
  var w = writeMongo({
    headers: {
      insert: function (body, options, callback) {
        headers.push([body, options])
        setTimeout(function () {
          if (fheader) fheader = false, callback({code: 11000}) // already exists
          else callback()
        }, 0)
      },
      aggregate: function (sort, group, callback) {
        aggregate = [sort, group]
        setTimeout(function () {
          callback(null, [
            {
              _id: 'welcometotheecmascripteditiondiscussionlist',
              subject: 'Welcome to the ECMAScript Edition 4 discussion list',
              messages: 1,
              first: { email: 'baz@example.com', name: 'Brendan Eich' },
              last: { email: 'baz@example.com', name: 'Brendan Eich' },
              start: new Date('2006-06-03T19:35:18.000Z'),
              end: new Date('2006-06-03T19:35:18.000Z')
            },
            {
              _id: 'estranslator',
              subject: 'ES4 translator',
              messages: 2,
              first: { email: 'bar@example.com', name: 'Olav Junker Kjær' },
              last: { email: 'bar@example.com', name: 'Olav Junker Kjær' },
              start: new Date('2006-06-06T13:40:48.000Z'),
              end: new Date('2013-07-11T11:48:24.000Z')
            },
            {
              _id: 'dateliterals',
              subject: 'date literals',
              messages: 1,
              first: { email: 'foo@example.com', name: 'Robert Sayre' },
              last: { email: 'foo@example.com', name: 'Robert Sayre' },
              start: new Date('2006-06-07T15:43:37.000Z'),
              end: new Date('2006-06-07T15:43:37.000Z')
            }
          ])
        }, 0)
      }
    },
    contents: {
      insert: function (body, options, callback) {
        contents.push([body, options])
        setTimeout(function () {
          if (fcontents) fcontents = false, callback({code: 11000}) // already exists
          else callback()
        }, 0)
      }
    },
    topics: {
      update: function (selector, body, options, callback) {
        topics.push([selector, body, options])
        setTimeout(function () {
          callback()
        }, 0)
      }
    }
  })
  var src = filter()
  var result = src.syphon(w).buffer()
  var data = fs.readFileSync(__dirname + '/fixtures/input.json', 'utf8').split('\n').map(JSON.parse)
  data.forEach(function (data) {
    data.header.date = new Date(data.header.date)
    src.write(data)
  })
  src.end()
  it('passes the messages through', function (done) {
    result.nodeify(function (err, res) {
      if (err) return done(err)
      assert.deepEqual(res.map(function (r) { return r.subjectID }), ['welcometotheecmascripteditiondiscussionlist', 'estranslator', 'dateliterals', 'estranslator'])
      return done()
    })
  })
  it('inserts headers into the `headers` collection', function (done) {
    result.nodeify(function (err, res) {
      if (err) return done(err)
      headers.map(function (h) { return h[1] }).forEach(function (v) { assert.deepEqual(v, {safe: true})})
      assert.deepEqual(headers.map(function (h) { return h[0] }), [
        {
          from: { email: 'baz@example.com', name: 'Brendan Eich' },
          date: new Date('2006-06-03T19:35:18.000Z'),
          subject: 'Welcome to the ECMAScript Edition 4 discussion list',
          _id: '2006-06-03T19:35:18.000Z-baz.example.com',
          subjectID: 'welcometotheecmascripteditiondiscussionlist',
          url: 'https://mail.mozilla.org/pipermail/es-discuss/2006-June/003436.html'
        },
        {
          from: { email: 'bar@example.com', name: 'Olav Junker Kjær' },
          date: new Date('2006-06-06T13:40:48.000Z'),
          subject: 'ES4 translator',
          _id: '2006-06-06T13:40:48.000Z-bar.example.com',
          subjectID: 'estranslator',
          url: 'https://mail.mozilla.org/pipermail/es-discuss/2006-June/003436.html'
        },
        {
          from: { email: 'foo@example.com', name: 'Robert Sayre' },
          date: new Date('2006-06-07T15:43:37.000Z'),
          subject: 'date literals',
          _id: '2006-06-07T15:43:37.000Z-foo.example.com',
          subjectID: 'dateliterals',
          url: 'https://mail.mozilla.org/pipermail/es-discuss/2006-June/003437.html'
        },
        {
          from: { email: 'bar@example.com', name: 'Olav Junker Kjær' },
          date: new Date('2013-07-11T11:48:24.000Z'),
          subject: 'ES4 translator',
          _id: '2013-07-11T11:48:24.000Z-bar.example.com',
          subjectID: 'estranslator',
          url: 'https://mail.mozilla.org/pipermail/es-discuss/2006-June/003436.html'
        }
      ])
      return done()
    })
  })
  it('inserts contents into the `contents` collection', function (done) {
    result.nodeify(function (err, res) {
      if (err) return done(err)
      contents.map(function (c) { return c[1] }).forEach(function (v) { assert.deepEqual(v, {safe: true})})
      assert.deepEqual(contents.map(function (c) { return c[0] }), [
        {
          _id: '2006-06-03T19:35:18.000Z-baz.example.com',
          subjectID: 'welcometotheecmascripteditiondiscussionlist',
          content: 'Thanks to Graydon Hoare for setting it up.\n\n/be'
        },
        {
          _id: '2006-06-06T13:40:48.000Z-bar.example.com',
          subjectID: 'estranslator',
          content: 'Hello,\nI\'m very pleased to s the new public specs for ES4'
        },
        {
          _id: '2006-06-07T15:43:37.000Z-foo.example.com',
          subjectID: 'dateliterals',
          content: 'I think the date literal should allow a trailing \'Z\' to substitute for\n\'+00:00\'.\n\nRobert Sayre'
        },
        {
          _id: '2013-07-11T11:48:24.000Z-bar.example.com',
          subjectID: 'estranslator',
          content: 'Wow, a reply...increadible!'
        }
      ])
      return done()
    })
  })
  it('inserts topics into the `topics` collection', function (done) {
    result.nodeify(function (err, res) {
      if (err) return done(err)
      topics.map(function (t) { return t[2] }).forEach(function (v) { assert.deepEqual(v, {upsert: true})})
      assert.deepEqual(topics.map(function (t) { return t[0] }), [
        { _id: 'welcome-to-the-ecmascript-edition-4-discussion-list' },
        { _id: 'es4-translator' },
        { _id: 'date-literals' }
      ])
      assert.deepEqual(topics.map(function (t) { return t[1] }), [
        {
          _id: 'welcome-to-the-ecmascript-edition-4-discussion-list',
          subject: 'Welcome to the ECMAScript Edition 4 discussion list',
          messages: 1,
          first: { email: 'baz@example.com', name: 'Brendan Eich' },
          last: { email: 'baz@example.com', name: 'Brendan Eich' },
          start: new Date('2006-06-03T19:35:18.000Z'),
          end: new Date('2006-06-03T19:35:18.000Z'),
          subjectID: 'welcometotheecmascripteditiondiscussionlist'
        },
        {
          _id: 'es4-translator',
          subject: 'ES4 translator',
          messages: 2,
          first: { email: 'bar@example.com', name: 'Olav Junker Kjær' },
          last: { email: 'bar@example.com', name: 'Olav Junker Kjær' },
          start: new Date('2006-06-06T13:40:48.000Z'),
          end: new Date('2013-07-11T11:48:24.000Z'),
          subjectID: 'estranslator'
        },
        {
          _id: 'date-literals',
          subject: 'date literals',
          messages: 1,
          first: { email: 'foo@example.com', name: 'Robert Sayre' },
          last: { email: 'foo@example.com', name: 'Robert Sayre' },
          start: new Date('2006-06-07T15:43:37.000Z'),
          end: new Date('2006-06-07T15:43:37.000Z'),
          subjectID: 'dateliterals'
        }
      ])
      return done()
    })
  })
})
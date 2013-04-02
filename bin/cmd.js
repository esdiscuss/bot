#!/usr/bin/env node

var fs = require('fs');
var through = require('through');
var bot = require('../');

var defaultSettings = require('./settings.default.json');
var settings = defaultSettings;
try {
  settings = require('./settings.json');
} catch (ex) {}

var optimist = require('optimist')
  .boolean('H')
  .alias('H', 'h')
  .alias('H', 'help')
  .alias('H', '?')
  .describe('H', 'Dispalay usage info')

  .boolean('S')
  .alias('S', 'save')
  .describe('S', 'Save settings except dry-run and help')
  .boolean('C')
  .alias('C', 'clear')
  .describe('C', 'Remove any saved settings')

  .boolean('D')
  .alias('D', 'dry-run')
  .describe('D', 'Do not commit to GitHub (can ommit user, password etc.)')

  .string('s')
  .alias('s', 'source')
  .describe('s', 'The pipermail url to read messages from')
  .default('s', settings.source || undefined)
  .demand('s')

  .string('u')
  .alias('u', 'user')
  .describe('u', 'The username to commit to GitHub with')
  .default('u', settings.user || undefined)
  .string('p')
  .alias('p', 'pass')
  .describe('p', 'The password to commit to GitHub with')
  .default('p', settings.pass || undefined)
  .string('o')
  .alias('o', 'organisation')
  .describe('o', 'The organisation the repositories belong under.')
  .default('o', settings.organisation || undefined)
  .string('t')
  .alias('t', 'team')
  .describe('t', 'The team to be given commit access to newly created repos')
  .default('t', settings.team || undefined)

  .string('a')
  .alias('a', 'age')
  .describe('a', 'The maximum age of messages to check')
  .default('a', settings.age || undefined)
  .demand('a');
var args = optimist.argv;
if (args.h || args.H || args['?'] || args.help) {
  console.warn();
  optimist.showHelp();
  process.exit(0);
}

if (args.save) {
  fs.writeFileSync(__dirname + '/settings.json', JSON.stringify({
    source: args.source,
    organisation: args.organisation,
    team: args.team,
    age: args.age,
    user: args.user,
    pass: args.pass
  }, null, 2));
  process.exit(0);
}
if (args.clear) {
  fs.writeFileSync(__dirname + '/settings.json', JSON.stringify(defaultSettings, null, 2));
  process.exit(0);
}

if (!args['dry-run']) {
  optimist.demand('u')
          .demand('p')
          .demand('o')
          .demand('t')
          .argv;
}



function jsonify() {
  return through(function (message) {
    this.queue(JSON.stringify(message.header) + '\n');
  })
}

function stringify() {
  return through(function (message) {
    var date = normaliseDate(message.header.date);
    var messageID = message.header.messageID.replace(/\</g, '').replace(/\>/g, '');
    var path = 'https://raw.github.com/esdiscuss/' + date + '/master/' + encodeURIComponent(messageID);
    this.queue(path + '/header.json' + '\n\n');
  })
}

function normaliseDate(date) {
  var month = '' + (date.getMonth() + 1);
  if (month.length === 1) month = '0' + month;
  return date.getFullYear() + '-' + month;
}

bot(args).pipe(jsonify())
        .pipe(process.stdout);
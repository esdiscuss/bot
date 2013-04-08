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
  .boolean('help')
  .alias('help', 'H')
  .alias('help', 'h')
  .alias('help', 'help')
  .alias('help', '?')
  .describe('help', 'Dispalay usage info')

  .boolean('save')
  .alias('save', 'S')
  .describe('save', 'Save settings except dry-run and help')

  .boolean('clear')
  .alias('clear', 'C')
  .describe('clear', 'Remove any saved settings')

  .boolean('dry-run')
  .alias('dry-run', 'D')
  .describe('dry-run', 'Do not commit to GitHub (can ommit user, password etc.)')

  .string('source')
  .alias('source', 's')
  .describe('source', 'The pipermail url to read messages from')
  .default('source', settings.source || undefined)
  .demand('source')

  .string('user')
  .alias('user', 'u')
  .describe('user', 'The username to commit to GitHub with')
  .default('user', settings.user || undefined)
  .string('pass')
  .alias('pass', 'p')
  .describe('pass', 'The password to commit to GitHub with')
  .default('pass', settings.pass || undefined)
  .string('organisation')
  .alias('organisation', 'o')
  .describe('organisation', 'The organisation the repositories belong under.')
  .default('organisation', settings.organisation || undefined)
  .string('team')
  .alias('team', 't')
  .describe('team', 'The team to be given commit access to newly created repos')
  .default('team', settings.team || undefined)

  .string('db')
  .describe('db', 'The mongodb connection string to write metadata to')
  .default('db', settings.db || undefined)

  .string('age')
  .alias('age', 'a')
  .describe('age', 'The maximum age of messages to check')
  .default('age', settings.age || undefined)
  .demand('age');

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
    pass: args.pass,
    db: args.db
  }, null, 2));
  process.exit(0);
}
if (args.clear) {
  fs.writeFileSync(__dirname + '/settings.json', JSON.stringify(defaultSettings, null, 2));
  process.exit(0);
}

if (!args['dry-run']) {
  optimist.demand('user')
          .demand('pass')
          .demand('organisation')
          .demand('team')
          .demand('db')
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

bot(args).pipe(jsonify()).pipe(process.stdout);
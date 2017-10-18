import Promise = require('promise');
import {Writable} from 'barrage';
import {Message} from 'pipermail';
import Database from './database';

const slug: (str: string) => string = require('slugg');

export interface Options {
  db: Database;
  months?: number;
}
export default function outputToMongo({db, months}: Options) {
  let writtenSomething = false;
  return new Writable<Message>({
    objectMode: true,
    write(message, encoding, callback) {
      writtenSomething = true;
      const id =
        message.header.date.toISOString() +
        '-' +
        message.header.from.email.replace(/@/g, '.');
      const subjectID = tag(message.header.subject);
      Promise.all([
        db.addHeader({
          ...message.header,
          _id: id,
          subjectID,
          url: message.url,
        }),
        db.addContent({
          _id: id,
          subjectID,
          content: message.body,
        }),
      ]).done(() => callback(), callback);
    },
    final(callback) {
      if (writtenSomething) {
        updateTopics(db, {months}).done(() => callback(), callback);
      } else {
        callback();
      }
    },
  });
}

function tag(subject: string): string {
  return subject
    .replace(/[^a-z]+/gi, '')
    .replace(/fwd?/gi, '')
    .replace(/re/gi, '')
    .toLowerCase();
}

export function updateTopics(
  db: Database,
  options: {months?: number},
): Promise<void> {
  var sort = {$sort: {date: 1}};
  var group = {
    $group: {
      _id: '$subjectID',
      subject: {$first: '$subject'},
      messages: {$sum: 1},
      first: {$first: '$from'},
      last: {$last: '$from'},
      start: {$first: '$date'},
      end: {$last: '$date'},
    },
  };
  let startMonth = undefined;
  if (typeof options.months === 'number') {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();
    month -= options.months;
    while (month < 0) {
      year--;
      month += 12;
    }
    startMonth = new Date(year, month);
  }
  return db
    .getTopics(startMonth)
    .then(topics => Promise.all(topics.map(topic => db.updateTopic(topic))))
    .then(() => {});
}

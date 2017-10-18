import connect, {
  Database as DatabaseConnection,
  Collection,
  Cursor,
} from 'then-mongo';
import {Header} from 'pipermail';
import Promise = require('promise');
const slug: (str: string) => string = require('slugg');

export interface dbHeader extends Header {
  _id: string;
  subjectID: string;
  url: string;
}

export interface dbContent {
  _id: string;
  subjectID: string;
  content: string;
}

export interface dbTopic {
  _id: string;
  subjectID: string;

  subject: string;
  messages: number;
  first: {
    name: string;
    email: string;
  };
  last: {
    name: string;
    email: string;
  };

  start: Date;
  end: Date;
}

export default class Database {
  private headers: Collection;
  private contents: Collection;
  private topics: Collection;
  private log: Collection;
  private runsPerDay: Collection;
  constructor(str: string) {
    const db = connect(str);
    this.headers = db.collection('headers');
    this.contents = db.collection('contents');
    this.topics = db.collection('topics');
    this.log = db.collection('log');
    this.runsPerDay = db.collection('runsPerDay');
  }
  getHeaderByUrl(url: string): Promise<dbHeader> {
    return this.headers.findOne({url: url}) as any;
  }
  hasContent(id: string): Promise<boolean> {
    return this.headers
      .find({_id: id})
      .count()
      .then(result => !!result);
  }
  addHeader(header: dbHeader): Promise<void> {
    return this.headers.insert(header, {safe: true}).then<void, void>(
      () => {},
      err => {
        if (err.code != 11000) {
          //if not "document already exists"
          throw err;
        }
      },
    );
  }
  addContent(content: dbContent): Promise<void> {
    return this.contents.insert(content, {safe: true}).then<void, void>(
      () => {},
      err => {
        if (err.code != 11000) {
          //if not "document already exists"
          throw err;
        }
      },
    );
  }
  getTopics(startMonth?: Date): Promise<dbTopic[]> {
    // TODO a few to many "any" keywords in this one
    const sort = {$sort: {date: 1}};
    const group = {
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
    const cursor: Cursor = startMonth
      ? (this.headers.aggregate as any)(sort, group, {
          $match: {end: {$gt: startMonth}},
        })
      : (this.headers.aggregate as any)(sort, group);
    return cursor.toArray().then(objects =>
      objects.map((obj): dbTopic => {
        return {
          ...(obj as any),
          subjectID: (obj as any)._id,
          _id: slug((obj as any).subject),
        };
      }),
    );
  }
  updateTopic(topic: dbTopic): Promise<void> {
    return this.topics
      .update({_id: topic._id}, topic, {upsert: true})
      .then(() => {});
  }

  logRun(start: Date, end: Date): Promise<void> {
    var now = new Date();
    var day = now.toISOString().split('T')[0];
    return Promise.all([
      this.log.insert(
        {
          type: 'bot-run',
          start,
          end,
        },
        {safe: true},
      ),
      this.runsPerDay.update(
        {_id: day},
        {
          $inc: {
            runs: 1,
            totalDuration: start.getTime() - end.getTime(),
          },
        },
        {upsert: true},
      ),
    ]).then(() => {});
  }
}

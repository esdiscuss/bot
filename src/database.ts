import {Connection, sql} from '@databases/pg';

export interface DbMessage {
  id: number;
  topic_id: number;
  from_email: string;
  from_name: string;
  reply: string; // <- URL
  sent_at: Date;
  original_content: string;
  source_url: string; // <- URL
  message_key: string;
  // edited_content: string | null; <- not used by bot
  // edited_at: Date | null; <- not used by bot
}
export interface DbTopic {
  id: number;
  topic_name: string;
  topic_slug: string;
  topic_key: string;
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
  private db: Connection;
  constructor(db: Connection) {
    this.db = db;
  }
  async tx<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
    return await this.db.tx((tx) => fn(new Database(tx)));
  }
  async hasMessage(url: string): Promise<boolean> {
    const [{count}] = await this.db.query(sql`
      SELECT
        count(*) AS count
      FROM
        messages
      WHERE
        source_url = ${url};
    `);
    return count !== 0;
  }

  async insertMessage(m: Omit<DbMessage, 'id'>) {
    await this.db.query(sql`
      INSERT INTO messages (topic_id, from_email, from_name, reply, sent_at, original_content, source_url, message_key)
		    VALUES(${m.topic_id}, ${m.from_email}, ${m.from_name}, ${m.reply}, ${m.sent_at}, ${m.original_content}, ${m.source_url}, ${m.message_key})
    `);
  }

  async getTopicByKey(key: string): Promise<DbTopic | undefined> {
    const [topic] = await this.db.query(sql`
      SELECT
        id,
        topic_name,
        topic_slug,
        topic_key
      FROM
        topics
      WHERE
        topic_key = ${key};
    `);
    return topic;
  }

  async insertTopic(t: Omit<DbTopic, 'id'>): Promise<DbTopic> {
    const [topicWithID] = await this.db.query(sql`
      INSERT INTO topics (topic_name, topic_slug, topic_key)
        VALUES (${t.topic_name}, ${t.topic_slug}, ${t.topic_key})
        ON CONFLICT (topic_key)
        DO UPDATE SET
          topic_key = EXCLUDED.topic_key
        RETURNING
          id,
          topic_name,
          topic_slug,
          topic_key;
    `);
    return topicWithID;
  }

  async logRun(): Promise<void> {
    var now = new Date();
    var day = now.toISOString().split('T')[0];
    await this.db.query(sql`
      INSERT INTO bot_runs_per_day (id, runs_count)
        VALUES (${day}, 1)
        ON CONFLICT (id) DO UPDATE SET runs_count = bot_runs_per_day.runs_count + 1;
    `);
  }
}

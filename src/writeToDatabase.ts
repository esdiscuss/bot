import {Writable} from 'barrage';
import {Message} from 'pipermail';
import Database, {DbTopic} from './database';
import {subjectToTopicKey, subjectToTopicSlug} from './subjectLineHelpers';

export interface Options {
  db: Database;
}
export default function writeToDatabase({db}: Options) {
  const topicsByKey = new Map<string, DbTopic | undefined>();
  return new Writable<Message>({
    objectMode: true,
    write(message, _encoding, callback) {
      const message_key =
        message.header.date.toISOString() +
        '-' +
        message.header.from.email.replace(/@/g, '.');
      const topic_key = subjectToTopicKey(message.header.subject);
      Promise.resolve(null)
        .then(async () => {
          let topic =
            topicsByKey.get(topic_key) || (await db.getTopicByKey(topic_key));
          topicsByKey.set(topic_key, topic);
          db.tx(async (db) => {
            if (!topic) {
              topic = await db.insertTopic({
                topic_name: message.header.subject,
                topic_slug: subjectToTopicSlug(message.header.subject),
                topic_key,
              });
            }
            db.insertMessage({
              topic_id: topic.id,
              from_email: message.header.from.email,
              from_name: message.header.from.name,
              reply: message.header.reply,
              sent_at: message.header.date,
              original_content: message.body,
              source_url: message.url,
              message_key,
            });
          });
        })
        .then(
          () => setImmediate(() => callback()),
          (err) => setImmediate(() => callback(err)),
        );
    },
    final(callback) {
      callback();
    },
  });
}

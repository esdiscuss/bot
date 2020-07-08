import assert = require('assert');
import pipermail, {Message, ReadableStream} from 'pipermail';
import Database from './database';

let status = '';
export function getStatus(): string {
  return status;
}

export interface Options {
  db: Database;
  source: string;
  parallel?: number;
  months?: number;
  onError(err: Error): any;
}

export default function messages(options: Options): ReadableStream<Message> {
  const source = options.source.replace(/([^\/])\/?$/g, '$1/');
  const db = options.db;

  return pipermail(source, {
    parallel: options.parallel,
    months: options.months,
    async filterMessage(url: string) {
      return await db.hasMessage(url);
    },
  }).filter(function (message) {
    //filter spam
    if (
      /spam/i.test(message.header.subject) ||
      /no subject/i.test(message.header.subject)
    ) {
      return false;
    }

    assert(
      message.url ===
        message.url.replace(
          /\/+([^\/]+)\/+([^\/]+)\/+([^\/]+)\/+([^\/]+)$/,
          '/$1/$2/$3/$4',
        ),
    );
    return true;
  });
}

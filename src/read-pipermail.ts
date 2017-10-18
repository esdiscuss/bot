import assert = require('assert');
import pipermail, {Message, ReadableStream} from 'pipermail';
import Promise = require('promise');
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

export default function messages(options: Options) {
  const source = options.source.replace(/([^\/])\/?$/g, '$1/');
  const db = options.db;

  return pipermail(source, {
    parallel: options.parallel,
    months: options.months,
    filterMessage(url: string): PromiseLike<boolean> {
      var start = Date.now();
      return db
        .getHeaderByUrl(url)
        .then(header => {
          if (!header) {
            return true;
          }
          return db.hasContent(header._id).then(hasContent => !hasContent);
        })
        .then(function(result) {
          var end = Date.now();
          status = url + ' ' + (end - start) + 'ms ' + JSON.stringify(result);
          return result;
        });
    },
  }).filter(function(message) {
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

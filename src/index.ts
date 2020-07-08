import Promise = require('promise');
import readPipermail, {Options as ReadOptions} from './read-pipermail';
import writeToDatabase, {Options as WriteOptions} from './writeToDatabase';

export interface Options extends ReadOptions, WriteOptions {}
export default function doRun(options: Options): Promise<void> {
  const source = readPipermail(options);
  const sink = writeToDatabase(options);
  return Promise.resolve(source.syphon(sink).wait());
}

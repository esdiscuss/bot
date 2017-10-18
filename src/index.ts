import Promise = require('promise');
import readPipermail, {Options as ReadOptions} from './read-pipermail';
import writeMongo, {Options as WriteOptions} from './write-mongo';

export interface Options extends ReadOptions, WriteOptions {}
export default function doRun(options: Options): Promise<void> {
  const source = readPipermail(options);
  const sink = writeMongo(options);
  return Promise.resolve(source.syphon(sink).wait());
}

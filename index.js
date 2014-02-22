'use strict';

var Promise = require('promise');
var readPipermail = require('./lib/read-pipermail');
var writeMongo = require('./lib/write-mongo');

module.exports = doRun;
function doRun(options) {
  var source = readPipermail(options);
  var sink = writeMongo(options);
  return source.syphon(sink).wait();
}
var vm = require('vm');
var fs = require('fs');
var byline = require('byline');
var Fiber = require ("fibers");
var events = require ("events");
var util = require("util");

var v8ToolsPath = __dirname + '/../deps/v8/';
var names = 'codemap,profile,logreader,csvparser,splaytree,profile_view,consarray,tickprocessor'.split(',');
for (var i in names) {
  var name = names[i];
  var filePath = v8ToolsPath + name + '.js';
  vm.runInThisContext(fs.readFileSync(filePath), filePath);
}

global.os = require('./os');
global.print = console.log;

var TickBro = function (params) {
  events.EventEmitter.call(this);

  var me = this;
  var snapshotLogProcessor;
  if (params.snapshotLogFileName) {
    snapshotLogProcessor = new SnapshotLogProcessor();
    snapshotLogProcessor.processLogFile(params.snapshotLogFileName);
  }
  me.tickProcessor = new TickProcessor(
    new (TickBro.entriesProviders[params.platform])(params.nm),
    params.separateIc,
    params.callGraphSize,
    params.ignoreUnknown,
    params.stateFilter,
    snapshotLogProcessor);
};
util.inherits(TickBro, events.EventEmitter);

TickBro.defaultParams = {
  platform: null,
  stateFilter: null,
  callGraphSize: 5,
  ignoreUnknown: false,
  separateIc: false,
  nm: "nm"
};

// Auto-detect platform
switch (process.platform) {
case 'win32':
case 'win64': // <- doesn't exist, but maybe it will one day
  TickBro.defaultParams.platform = 'win';
  break;
case 'mac':
  TickBro.defaultParams.platform = 'mac';
  break;
case 'linux':
default:
  TickBro.defaultParams.platform = 'unix';
  break;
}

TickBro.entriesProviders = {
  'unix': UnixCppEntriesProvider,
  'windows': WindowsCppEntriesProvider,
  'mac': MacCppEntriesProvider
};

TickBro.prototype.processLogFile = function (callback) {
  var me = this;

  var totalSize = fs.statSync('v8.log').size;
  var doneSize = 0;
  var lastProgress = 0;
  var stream = byline(fs.createReadStream('v8.log', {flags:'r'}));
  stream.on('data', function (line) {
    line = line.toString('utf-8');
    stream.pause();

    setImmediate(function () {
      Fiber(function() {
        doneSize += line.length + 1;
        var currentTime = new Date().getTime();
        if ((currentTime - lastProgress) > 500) {
          me.emit('progress', {
            doneBytes: doneSize,
            totalBytes: totalSize,
            percent: Math.round(doneSize / totalSize * 1000) / 10
          });
          lastProgress = currentTime;
        }
        me.tickProcessor.processLogLine(line);
        stream.resume();
      }).run();
    });
  });

  // TODO: The end event might complete before the last line is processed.
  stream.on('end', callback || function () {});
};

TickBro.prototype.printStatistics = function () {
  this.tickProcessor.printStatistics();
};

TickBro.prototype.getFlatProfile = function () {
  var flatProfile = this.tickProcessor.profile_.getFlatProfile();
  var flatView = this.tickProcessor.viewBuilder_.buildView(flatProfile);
  // Sort by self time, desc, then by name, desc.
  flatView.sort(function(rec1, rec2) {
    return rec2.selfTime - rec1.selfTime ||
      (rec2.internalFuncName < rec1.internalFuncName ? -1 : 1);
  });
  var flatViewNodes = flatView.head.children;
//console.log(flatViewNodes);
  return flatViewNodes.map(function (node) {
    return {
      internalFuncName: node.internalFuncName,
      totalTime: node.totalTime,
      selfTime: node.selfTime
    };
  });
};

exports.TickBro = TickBro;
exports.TickProcessor = TickProcessor;

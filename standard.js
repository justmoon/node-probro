var TickBro = require('./src/tickbro').TickBro;
var os = require('./src/os');

var tickBro = new TickBro(TickBro.defaultParams);
tickBro.processLogFile(function () {
  tickBro.printStatistics();
});

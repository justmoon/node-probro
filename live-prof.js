var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var io = require('socket.io');
var logger = require('winston');
var lessMiddleware = require('less-middleware');

var TickBro = require('./src/tickbro').TickBro;

var app = express();

app.configure(function(){
  var pub = path.join(__dirname, 'public');
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  // logging via winston
  var winstonStream = {
    write: function(str){
      logger.info(str.replace(/\n$/g, ''));
    }
  };
  app.use(express.logger({format: 'dev', stream:winstonStream}));
  app.use(lessMiddleware({
    src: __dirname + '/public',
    compress: true
  }));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(pub));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);

logger.cli();

var server = app.listen(app.get('port'), function(){
  logger.info("Express server listening on port " + app.get('port'));
});

var socket = io.listen(server);
socket.set('logger', logger);

var isLogReady = false;
var tickBro = new TickBro(TickBro.defaultParams);
tickBro.on('progress', function handleProgress(data) {
  data.message = "Processing V8 log "+data.percent+"%...";
  socket.sockets.emit('progress', data);
});
tickBro.processLogFile(function () {
  isLogReady = true;

  // Broadcast init
  emitInit(socket.sockets);
});

socket.sockets.on('connection', function (socket) {
  if (isLogReady) {
    emitInit(socket);
  }

});

function emitInit(sock) {
  var data = {};
  data.flat = tickBro.getFlatProfile();;

  sock.emit('init', data);
};

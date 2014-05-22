var socket = io.connect('http://192.168.0.17');
socket.on('progress', function (data) {
  new EJS({url: '/ejs/progress.ejs'}).update('main', data);
});

socket.on('init', function (data) {
  new EJS({url: '/ejs/layout.ejs'}).update('main', data);
});

var tagRegex = /^(Stub|Builtin|LazyCompile|Function)\:\s(.*)$/i;
EJS.Helpers.prototype.simple_func_name = function (fname) {
  var tagMatch;
  if ((tagMatch = tagRegex.exec(fname))) {
    fname = tagMatch[2];
  }
  var firstBracket;
  if ((firstBracket = fname.lastIndexOf('(')) !== -1) {
    fname = fname.substr(0, firstBracket);
  }
  var lastColon;
  if ((lastColon = fname.lastIndexOf('::', fname.length - 10)) !== -1) {
    //fname = fname.substr(lastColon+2);
  }
  if (fname.indexOf('A builtin from the snapshot') === 0) {
    fname = '<snapshot>';
  }
  //fname = fname.split(' ').shift();
  return fname;
};

var child_process = require ("child_process");
var Fiber = require ("fibers");
var Future = require ("fibers/future");

exports.system = function (cmd, args) {
  var fiber = Fiber.current;
  var result = '';
  var child = child_process.exec(cmd + ' ' + args.join(' '), {
    maxBuffer: 20 * 1024 * 1024
  }, function (error, stdout, stderr) {
    result = stdout;
    fiber.run();
  });
  Fiber.yield();

  return result;
};

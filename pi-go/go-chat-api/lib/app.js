'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var engine_command = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(engine, c) {
    var cc, output;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            console.log("do command: ", c);
            cc = Command.fromString(c);
            _context.next = 4;
            return engine.sendCommand(cc);

          case 4:
            output = _context.sent;

            console.log("finish command: ", c);
            console.log(output);
            return _context.abrupt('return', output.content);

          case 8:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function engine_command(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _cors = require('cors');

var _cors2 = _interopRequireDefault(_cors);

var _socket = require('socket.io');

var _socket2 = _interopRequireDefault(_socket);

var _config = require('../config/config.json');

var _config2 = _interopRequireDefault(_config);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _require = require('@sabaki/gtp'),
    Controller = _require.Controller,
    Command = _require.Command,
    Response = _require.Response;

var leelaz_path = '/home/daikon/Documents/ESL2018/pi-go/leelaz/leelaz';
var leelaz_weight_path = '/home/daikon/Documents/ESL2018/pi-go/leelaz/best-network';
var leelaz_args = ['--gtp', '-w', leelaz_weight_path];
var phoenixgo_path = '/home/daikon/Documents/ESL2018/pi-go/PhoenixGo/mcts/mcts_main';
var phoenixgo_config_path = '/home/daikon/Documents/ESL2018/pi-go/PhoenixGo/pi-go.conf';
var phoenixgo_args = ['--config_path=' + phoenixgo_config_path, '--gtp'];
// setup server
var app = (0, _express2.default)();
var server = _http2.default.createServer(app);

var socketIo = (0, _socket2.default)(server);

// Allow CORS
app.use((0, _cors2.default)());

// Render a API index page
app.get('/', function (req, res) {
  res.sendFile(_path2.default.resolve('public/index.html'));
});

// Start listening
server.listen(process.env.PORT || _config2.default.port);
console.log('Started on port ' + _config2.default.port);

var findneighbor = function findneighbor(point, b, m) {
  var q = [point];
  var area = [point];
  var border = [];
  while (q.length > 0) {
    var p = q[0];
    q.shift();

    var _loop = function _loop(k) {
      var tx = -1;
      var ty = -1;
      if (k == 0) {
        tx = p.x - 1;
        ty = p.y;
      } else if (k == 1) {
        tx = p.x + 1;
        ty = p.y;
      } else if (k == 2) {
        tx = p.x;
        ty = p.y - 1;
      } else if (k == 3) {
        tx = p.x;
        ty = p.y + 1;
      }
      if (tx < 0 || tx >= 19 || ty < 0 || ty >= 19) return 'continue';
      // not included yet
      if (b[tx][ty] === m) {
        if (!area.some(function (e) {
          return e.x === tx && e.y === ty;
        })) {
          q.push({ x: tx, y: ty });
          area.push({ x: tx, y: ty });
        }
      } else if (!border.find(function (e) {
        return e.x === tx && e.y === ty;
      })) {
        border.push({ x: tx, y: ty });
      }
    };

    for (var k = 0; k < 4; k++) {
      var _ret = _loop(k);

      if (_ret === 'continue') continue;
    }
  }
  return { area: area, border: border };
};
var EAT = function EAT(p, b) {
  if (b[p.x][p.y] == 0) return { eat: false, area: [], border: [] };
  var m = b[p.x][p.y];
  var n = m % 2 + 1;

  var _findneighbor = findneighbor(p, b, m),
      area = _findneighbor.area,
      border = _findneighbor.border;

  var k = 0;
  for (var i = 0; i < border.length; i++) {
    if (b[border[i].x][border[i].y] != n) {
      k = 1;
      break;
    }
  }
  if (k == 0) {
    // eaten!
    return { eat: true, area: area, border: border };
  } else {
    return { eat: false, area: area, border: border };
  }
};
var updatego = function updatego(p, b, color, ko) {
  var x = p.x;
  var y = p.y;
  // let b = this.state.board;
  // check empty
  //if(b[x][y]!= 0){
  //  this.setState({s_alert:'Invalid'});
  //  return {update:false, ko_h:[]};
  //}
  //b[x][y] = this.state.color;
  b[x][y] = color;

  var eaten = [];
  var ko_h = [];
  // find the eaten stones

  var _loop2 = function _loop2(k) {
    var tx = -1;
    var ty = -1;
    if (k == 0) {
      tx = p.x - 1;
      ty = p.y;
    } else if (k == 1) {
      tx = p.x + 1;
      ty = p.y;
    } else if (k == 2) {
      tx = p.x;
      ty = p.y - 1;
    } else if (k == 3) {
      tx = p.x;
      ty = p.y + 1;
    }
    if (tx < 0 || tx >= 19 || ty < 0 || ty >= 19) return 'continue';
    if (b[tx][ty] == (0 || color)) return 'continue';

    var _EAT2 = EAT({ x: tx, y: ty }, b),
        eat = _EAT2.eat,
        area = _EAT2.area,
        border = _EAT2.border;

    if (eat == false) {
      return 'continue';
    }
    // if not in eaten yet, eat it!!

    var _loop3 = function _loop3(j) {
      if (!eaten.find(function (e) {
        return e.x === area[j].x && e.y === area[j].y;
      })) eaten.push(area[j]);
    };

    for (var j = 0; j < area.length; j++) {
      _loop3(j);
    }
  };

  for (var k = 0; k < 4; k++) {
    var _ret2 = _loop2(k);

    if (_ret2 === 'continue') continue;
  }
  if (eaten.length > 0) {
    if (eaten.length == 1) {
      if (ko.length == 1 && eaten[0].x == ko[0].x && eaten[0].y == ko[0].y) {
        console.log("KO!!");
        b[x][y] = 0;
        return { update: false, ko_h: [] };
      }
      ko_h = [p];
    }
    for (var i = 0; i < eaten.length; i++) {
      b[eaten[i].x][eaten[i].y] = 0;
    }
  } else {
    // check invalid position
    var _EAT = EAT({ x: x, y: y }, b),
        eat = _EAT.eat,
        _area = _EAT.area,
        border = _EAT.border;

    if (eat == true) {
      console.log('Invalid position!');
      b[x][y] = 0;
      return { update: false, ko_h: [] };
    }
    ko_h = [];
  }
  //b = b?
  //this.setState({board:b})
  //if(this.state.test){
  //    this.setState({ko:ko_h});
  //}
  return { update: true, ko_h: ko_h };
};

var step_convert = function step_convert(c, a) {
  if (a) {
    var y = c.charCodeAt(0) - 65;
    if (y > 8) y -= 1;
    var x = 19 - parseInt(c.substr(1));
    return { x: x, y: y };
  } else {
    var c2 = (19 - c.x).toString();
    if (c.y >= 8) c.y += 1;
    var c1 = String.fromCharCode(65 + c.y);
    return c1 + c2;
  }
};

var newboard = function newboard() {
  var ss = 19;
  var e = new Array(ss);
  for (var i = 0; i < ss; i++) {
    e[i] = new Array(ss);
    for (var j = 0; j < ss; j++) {
      e[i][j] = 0;
    }
  }
  return e;
};
var userNameList = {
  0: { name: "leela-zero-1", url: "http://www.chessdom.com/wp-content/uploads/2018/04/LCZ.jpg", user_key: 0, isBattle: false },
  1: { name: "leela-zero-2", url: "http://www.chessdom.com/wp-content/uploads/2018/04/LCZ.jpg", user_key: 1, isBattle: false },
  2: { name: "leela-zero-3", url: "http://www.chessdom.com/wp-content/uploads/2018/04/LCZ.jpg", user_key: 2, isBattle: false },
  3: { name: " PhoenixGo-1", url: "http://i2.bangqu.com/lf1/news/20180429/5ae531728ceda.jpg", user_key: 3, isBattle: false },
  4: { name: " PhoenixGo-2", url: "http://i2.bangqu.com/lf1/news/20180429/5ae531728ceda.jpg", user_key: 4, isBattle: false },
  5: { name: " PhoenixGo-2", url: "http://i2.bangqu.com/lf1/news/20180429/5ae531728ceda.jpg", user_key: 5, isBattle: false }
};
var AInum = 6;
var AIboard = {
  0: { board: newboard(), ko: [], opponent: null, color: 0, pass: 0, engine: new Controller(leelaz_path, leelaz_args) },
  1: { board: newboard(), ko: [], opponent: null, color: 0, pass: 0, engine: new Controller(leelaz_path, leelaz_args) },
  2: { board: newboard(), ko: [], opponent: null, color: 0, pass: 0, engine: new Controller(leelaz_path, leelaz_args) },
  3: { board: newboard(), ko: [], opponent: null, color: 0, pass: 0, engine: new Controller(phoenixgo_path, phoenixgo_args) },
  4: { board: newboard(), ko: [], opponent: null, color: 0, pass: 0, engine: new Controller(phoenixgo_path, phoenixgo_args) },
  5: { board: newboard(), ko: [], opponent: null, color: 0, pass: 0, engine: new Controller(phoenixgo_path, phoenixgo_args) }
};
var step_color = null;
var s = { x: 0, y: 0 };
var user_key = AInum;
// Setup socket.io
socketIo.on('connection', function (socket) {
  var defaultImageUrl = 'https://thebenclark.files.wordpress.com/2014/03/facebook-default-no-profile-pic.jpg';
  var username = socket.handshake.query.username;
  var u_key = user_key;
  var newuser = { name: '' + username, url: defaultImageUrl, user_key: user_key, isBattle: false };
  userNameList[user_key] = newuser;
  user_key++;
  console.log(username + ' connected');
  socket.broadcast.emit('server:returnAllUser', userNameList);
  socket.emit('server:first_return', { userNameList: userNameList, user_key: newuser.user_key });

  var loginMessage = {
    message: 'user ' + username + ' has logged in!',
    fromServer: true
  };
  socket.broadcast.emit('server:loginUser', loginMessage);
  socket.on('client:message', function (data) {
    socket.broadcast.emit('server:message', data);
  });

  socket.on('client:getAllUser', function () {
    socket.emit('server:returnAllUser', userNameList);
  });
  socket.on('updateuserinfo', function (userinfo) {
    userNameList = userinfo;
    socket.broadcast.emit('server:returnAllUser', userNameList);
  });

  socket.on('client:onestep', function () {
    var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(message) {
      var o, play_command, res, return_message;
      return _regenerator2.default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              o = message.opponent;

              if (!(o < AInum)) {
                _context2.next = 22;
                break;
              }

              if (message.pass >= 2) {
                console.log("AI stop!");
                //await AIboard[o].engine.stop();
                AIboard[o].engine.stop();
                userNameList[o].isBattle = false;
              }
              AIboard[o].pass = message.pass;
              AIboard[o].board = message.board;
              AIboard[o].ko = message.ko;
              // play the opponent's move in engine
              if (AIboard[o].color == 1) step_color = 'W';else step_color = 'B';
              play_command = '';

              if (AIboard[o].pass == 1) play_command = 'play ' + step_color + ' pass';else {
                play_command = 'play ' + step_color + ' ' + step_convert({ x: message.stepx, y: message.stepy }, false);
              }
              _context2.next = 11;
              return engine_command(AIboard[o].engine, play_command);

            case 11:
              if (AIboard[o].color == 1) step_color = 'B';else step_color = 'W';
              _context2.next = 14;
              return engine_command(AIboard[o].engine, 'genmove ' + step_color);

            case 14:
              res = _context2.sent;

              s = { x: 0, y: 0 };
              if (res == 'pass') {
                console.log("AI pass");
                AIboard[o].pass += 1;
              } else {
                AIboard[o].pass = 0;
                s = step_convert(res, true);
                updatego(s, AIboard[o].board, AIboard[o].color, AIboard[o].ko);
              }

              return_message = { player: o, opponent: AIboard[o].opponent, board: AIboard[o].board, ko: AIboard[o].ko, pass: AIboard[o].pass, stepx: s.x, stepy: s.y };

              socketIo.emit('server:onestep', return_message);
              if (AIboard[o].pass >= 2) {
                console.log("Game finish!!");
                AIboard[o].engine.stop();
                userNameList[o].isBattle = false;
                console.log("AI stop!");
              }
              _context2.next = 23;
              break;

            case 22:
              socket.broadcast.emit('server:onestep', message);

            case 23:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, undefined);
    }));

    return function (_x3) {
      return _ref2.apply(this, arguments);
    };
  }());
  socket.on('disconnect', (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3() {
    var logoutMessage, i;
    return _regenerator2.default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            delete userNameList[u_key];
            socket.broadcast.emit('server:returnAllUser', userNameList);
            console.log(username + ' disconnected');
            logoutMessage = {
              message: 'user ' + username + ' has logged out!',
              fromServer: true,
              user_key: u_key
            };

            socket.broadcast.emit('server:logoutUser', logoutMessage);
            i = 0;

          case 6:
            if (!(i < AInum)) {
              _context3.next = 15;
              break;
            }

            if (!(AIboard[i].opponent == u_key && userNameList[i].isBattle == true)) {
              _context3.next = 12;
              break;
            }

            _context3.next = 10;
            return kIboard[i].engine.stop();

          case 10:
            userNameList[i].isBattle = false;
            console.log("client disconnect, AI stop!");

          case 12:
            i++;
            _context3.next = 6;
            break;

          case 15:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, undefined);
  })));

  socket.on('client:getInvitation', function () {
    var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(from_to) {
      var _return_message, o, _return_message2, res, _s, _return_message3, return_message;

      return _regenerator2.default.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              if (!(from_to.to < AInum)) {
                _context4.next = 25;
                break;
              }

              if (!userNameList[from_to.to].isBattle) {
                _context4.next = 6;
                break;
              }

              _return_message = { from: from_to.to, to: from_to.from, battling: 1 };

              socketIo.emit('server:reject', _return_message);
              _context4.next = 23;
              break;

            case 6:
              o = from_to.to;

              userNameList[o].isBattle = true;
              userNameList[from_to.from].isBattle = true;
              AIboard[o].opponent = from_to.from;
              AIboard[o].color = from_to.color;
              AIboard[o].engine.start();
              _return_message2 = { from: from_to.to, to: from_to.from };

              socketIo.emit('server:accept', _return_message2);

              if (!(AIboard[o].color == 1)) {
                _context4.next = 23;
                break;
              }

              console.log("AI first move");
              _context4.next = 18;
              return engine_command(AIboard[o].engine, 'genmove B');

            case 18:
              res = _context4.sent;
              _s = step_convert(res, true);

              updatego(_s, AIboard[o].board, AIboard[o].color, AIboard[o].ko);
              _return_message3 = { player: o, opponent: AIboard[o].opponent, board: AIboard[o].board, ko: AIboard[o].ko, pass: 0, stepx: _s.x, stepy: _s.y };

              socketIo.emit('server:onestep', _return_message3);

            case 23:
              _context4.next = 26;
              break;

            case 25:
              if (userNameList[from_to.to].isBattle == true) {
                return_message = { from: from_to.to, to: from_to.from, battling: 1 };

                socketIo.emit('server:reject', return_message);
              } else socket.broadcast.emit('server:getInvitation', from_to);

            case 26:
            case 'end':
              return _context4.stop();
          }
        }
      }, _callee4, undefined);
    }));

    return function (_x4) {
      return _ref4.apply(this, arguments);
    };
  }());
  socket.on('client:accept', function (from_to) {
    userNameList[from_to.from].isBattle = true;
    userNameList[from_to.to].isBattle = true;
    socket.broadcast.emit('server:accept', from_to);
  });
  socket.on('client:reject', function (from_to) {
    socket.broadcast.emit('server:reject', from_to);
  });
  socket.on('client:exit', function (from_to) {
    userNameList[from_to.user].isBattle = false;
  });
});
exports.default = app;
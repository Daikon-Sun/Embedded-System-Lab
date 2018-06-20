import http from 'http';
import express from 'express';
import cors from 'cors';
import io from 'socket.io';
import config from '../config/config.json';
import path from 'path';

const {Controller, Command, Response} = require('@sabaki/gtp')

var leelaz_path = '/home/daikon/Documents/ESL2018/pi-go/leelaz/leelaz'
var leelaz_weight_path = '/home/daikon/Documents/ESL2018/pi-go/leelaz/best-network'
var leelaz_args = ['--gtp', '-w', leelaz_weight_path]
var phoenixgo_path = '/home/daikon/Documents/ESL2018/pi-go/PhoenixGo/mcts/mcts_main'
var phoenixgo_config_path = '/home/daikon/Documents/ESL2018/pi-go/PhoenixGo/pi-go.conf'
var phoenixgo_args = ['--config_path=' + phoenixgo_config_path, '--gtp']
// setup server
const app = express();
const server = http.createServer(app);

const socketIo = io(server);

// Allow CORS
app.use(cors());

// Render a API index page
app.get('/', (req, res) => {
  res.sendFile(path.resolve('public/index.html'));
});

// Start listening
server.listen(process.env.PORT || config.port);
console.log(`Started on port ${config.port}`);

var findneighbor = (point, b, m) => {
  let q = [point];
  let area = [point];
  let border = [];
  while(q.length > 0){
    let p = q[0];
    q.shift();
    for(let k = 0; k<4; k++){
      let tx = -1;
      let ty = -1;
      if(k==0){
        tx = p.x-1;
        ty = p.y;
      }
      else if(k==1){
        tx = p.x+1;
        ty = p.y;
      }
      else if(k==2){
        tx = p.x;
        ty = p.y-1;
      }
      else if(k==3){
        tx = p.x;
        ty = p.y + 1;
      }
      if(tx < 0 || tx >= 19 || ty < 0 || ty >= 19)
        continue;
      // not included yet
      if(b[tx][ty] === m){
        if(!area.some(e => (e.x === tx && e.y === ty))){
          q.push({x:tx, y:ty});
          area.push({x:tx, y:ty});
        }
      }
      else if(!border.find(e=> (e.x === tx && e.y === ty))){
        border.push({x:tx, y:ty});
      }
    }
  }
  return {area:area, border:border};
}
var EAT = (p, b) => {
  if(b[p.x][p.y] == 0)
    return {eat:false, area:[], border:[]};
  let m = b[p.x][p.y];
  let n = m%2+1;
  let {area, border} = findneighbor(p, b, m);
  let k = 0;
  for(let i = 0 ; i < border.length; i++){
    if(b[border[i].x][border[i].y] != n){
      k = 1;
      break;
    }
  }
  if(k == 0){// eaten!
    return {eat:true, area:area, border:border};
  }
  else{
    return {eat:false, area:area, border:border};
  }
}
var updatego = (p, b, color, ko) => {
  console.log("updatego");
  console.log(p);
  console.log(b);
  console.log(color);
  console.log(ko);
  
  let x = p.x;
  let y = p.y;
  // let b = this.state.board;
  // check empty
  //if(b[x][y]!= 0){
  //  this.setState({s_alert:'Invalid'});
  //  return {update:false, ko_h:[]};
  //}
  //b[x][y] = this.state.color;
  b[x][y] = color;

  let eaten = [];
  let ko_h = [];
  // find the eaten stones
  for(let k = 0 ; k < 4; k ++){
    let tx = -1;
    let ty = -1;
    if(k==0){
      tx = p.x-1;
      ty = p.y;
    }
    else if(k==1){
      tx = p.x+1;
      ty = p.y;
    }
    else if(k==2){
      tx = p.x;
      ty = p.y-1;
    }
    else if(k==3){
      tx = p.x;
      ty = p.y + 1;
    }
    if(tx < 0 || tx >= 19 || ty < 0 || ty >= 19)
      continue;
    if(b[tx][ty] == (0 || color))
      continue;
    let {eat, area, border} = EAT({x:tx, y:ty}, b);
    if(eat==false){
      continue;
    }
    // if not in eaten yet, eat it!!
    for(let j = 0; j < area.length; j++)
      if(!eaten.find(e =>(e.x === area[j].x && e.y === area[j].y)))
        eaten.push(area[j]);
  }
  if(eaten.length > 0){
    if(eaten.length == 1){
      if((ko.length==1) && (eaten[0].x == ko[0].x && eaten[0].y == ko[0].y)){
        //this.setState({s_alert:"KO!!"});
        console.log("KO!!");
        b[x][y] = 0;
        return {update:false, ko_h:[]};
      }
      ko_h = [p];
    }
    for(let i = 0; i < eaten.length; i++)
      b[eaten[i].x][eaten[i].y] = 0;
  }
  else{// check invalid position
    let {eat, area, border} = EAT({x:x, y:y}, b);
    if(eat==true){
      //this.setState({s_alert:'Invalid position!'});
      console.log('Invalid position!');
      b[x][y] = 0;
      return {update:false, ko_h:[]};
    }
    ko_h = [];
  }
  //b = b?
  //this.setState({board:b})
  //if(this.state.test){
  //    this.setState({ko:ko_h});
  //}
  return {update:true, ko_h:ko_h};
}

var step_convert = (c, a) => {
  if(a){
    let y = c.charCodeAt(0) - 65;
    if(y > 8)
      y -= 1;
    let x = 19 - parseInt(c.substr(1));
    return {x:x, y:y};
  }
  else{
    let c2 = (19-c.x).toString();
    if(c.y >=8) 
      c.y += 1;
    let c1 = String.fromCharCode(65 + c.y);
    return c1+c2;
  }
}
async function engine_command(engine, c){
  console.log("do command: ", c);
  let cc = Command.fromString(c);
  let output = await engine.sendCommand(cc);
  console.log("finish command: ", c);
  console.log(output);
  return output.content;
}
var newboard = () => { 
  let ss = 19;
  let e = new Array(ss);
  for(let i=0;i<ss;i++){
    e[i] = new Array(ss);
    for(let j=0;j<ss;j++){
      e[i][j]=0;
    }
  }
  return e;
}
var userNameList = [
  {name: "leela-zero-1", url:"http://www.chessdom.com/wp-content/uploads/2018/04/LCZ.jpg", user_key:0, isBattle:false},
  {name: "leela-zero-2", url:"http://www.chessdom.com/wp-content/uploads/2018/04/LCZ.jpg", user_key:1, isBattle:false},
  {name: "leela-zero-3", url:"http://www.chessdom.com/wp-content/uploads/2018/04/LCZ.jpg", user_key:2, isBattle:false},
  {name:" PhoenixGo-1", url:"http://i2.bangqu.com/lf1/news/20180429/5ae531728ceda.jpg", user_key:3, isBattle:false},
  {name:" PhoenixGo-2", url:"http://i2.bangqu.com/lf1/news/20180429/5ae531728ceda.jpg", user_key:4, isBattle:false}
];
var AInum = 5;
var AIboard = [
  {board:newboard(), ko:[], opponent:null, color:0, pass:0, engine: new Controller(leelaz_path, leelaz_args)},
  {board:newboard(), ko:[], opponent:null, color:0, pass:0, engine: new Controller(leelaz_path, leelaz_args)},
  {board:newboard(), ko:[], opponent:null, color:0, pass:0, engine: new Controller(leelaz_path, leelaz_args)},
  {board:newboard(), ko:[], opponent:null, color:0, pass:0, engine: new Controller(phoenixgo_path, phoenixgo_args)},
  {board:newboard(), ko:[], opponent:null, color:0, pass:0, engine: new Controller(phoenixgo_path, phoenixgo_args)}
];
var step_color = null;
var s = {x:0, y:0};
var user_key = AInum;
// Setup socket.io
socketIo.on('connection', socket => {
  let defaultImageUrl = 'https://thebenclark.files.wordpress.com/2014/03/facebook-default-no-profile-pic.jpg';
  const username = socket.handshake.query.username;
  const u_key = user_key;
  let newuser = {name: `${username}`, url:defaultImageUrl, user_key: user_key, isBattle:false};
  user_key++;
  userNameList.push(newuser);
  console.log(`${username} connected`);
  socket.broadcast.emit('server:returnAllUser', userNameList);
  socket.emit('server:first_return', {userNameList: userNameList, user_key:newuser.user_key});

  const loginMessage = {
    message: `user ${username} has logged in!`,
    fromServer: true
  };
  socket.broadcast.emit('server:loginUser', loginMessage);
  socket.on('client:message', data => {
    //console.log(`${data.username}: ${data.message}`);
    socket.broadcast.emit('server:message', data);
  });

  socket.on('client:getAllUser', () => {
    socket.emit('server:returnAllUser', userNameList);
  });
  socket.on('updateuserinfo', userinfo => {
    userNameList = userinfo;
    socket.broadcast.emit('server:returnAllUser', userNameList);
  });

  socket.on('client:onestep', async (message) => {
    var o = message.opponent
    //console.log(message);
    if (o < AInum) {
      if(message.pass >= 2){
        console.log("AI stop!");
        //await AIboard[o].engine.stop();
        AIboard[o].engine.stop();
        userNameList[o].isBattle = false;
      }
      AIboard[o].pass = message.pass;
      AIboard[o].board = message.board;
      AIboard[o].ko = message.ko;
      // play the opponent's move in engine
      let play_command = '';
      if(AIboard[o].pass == 1)
        play_command = 'play pass';
      else{ 
        if(AIboard[o].color == 1)
          step_color = 'W';
        else
          step_color = 'B';
        play_command = 'play ' + step_color + ' ' + step_convert({x:message.stepx, y:message.stepy}, false);
      }
      await engine_command(AIboard[o].engine, play_command);
      //console.log("finish play! outside");
      if(AIboard[o].color == 1)
        step_color = 'B';
      else
        step_color = 'W';
      let res = await engine_command(AIboard[o].engine, 'genmove '+step_color);
      s = {x:0, y:0};
      if(res == 'pass'){
        console.log("AI pass");
        AIboard[o].pass += 1;
      }
      else{
        AIboard[o].pass = 0;
        s = step_convert(res, true);
        updatego(s,  AIboard[o].board, AIboard[o].color, AIboard[o].ko);
      }

      let return_message = {player: o, opponent:AIboard[o].opponent, board:AIboard[o].board, ko:AIboard[o].ko, pass:AIboard[o].pass, stepx:s.x, stepy:s.y};
      socketIo.emit('server:onestep', return_message);
      if(AIboard[o].pass >= 2){
        console.log("Game finish!!");
        AIboard[o].engine.stop();
        userNameList[o].isBattle = false;
        console.log("AI stop!");
      }
    } else {
      socket.broadcast.emit('server:onestep', message);
    } 
  });
  socket.on('disconnect', async () => {
    userNameList = userNameList.filter((v, i) => (v.user_key != u_key))
    socket.broadcast.emit('server:returnAllUser', userNameList);
    console.log(`${username} disconnected`);
    const logoutMessage = {
      message: `user ${username} has logged out!`,
      fromServer: true
    };
    socket.broadcast.emit('server:logoutUser', logoutMessage);
    for(let i = 0; i < AInum; i++){
      if(AIboard[i].opponent == u_key && userNameList[i].isBattle==true){
        await AIboard[i].engine.stop()
        userNameList[i].isBattle=false;
        console.log("client disconnect, AI stop!");
      }
    }
  });

  socket.on('client:getInvitation', async (from_to) => {
    if (from_to.to < AInum) {
      if (userNameList[from_to.to].isBattle) {
        let return_message = {from:from_to.to, to:from_to.from, battling:1};
        socketIo.emit('server:reject', return_message);
      } else {
        let o = from_to.to;
        userNameList[o].isBattle = true;
        AIboard[o].opponent = from_to.from;
        AIboard[o].color = from_to.color;
        AIboard[o].engine.start()
        let return_message = {from:from_to.to, to:from_to.from};
        socketIo.emit('server:accept', return_message);
        if(AIboard[o].color == 1){
          console.log("AI first move")
          let res = await engine_command(AIboard[o].engine, 'genmove B');
          let s = step_convert(res, true);
          updatego(s,  AIboard[o].board, AIboard[o].color, AIboard[o].ko);
          let return_message = {player: o, opponent:AIboard[o].opponent, board:AIboard[o].board, ko:AIboard[o].ko, pass:0, stepx:s.x, stepy:s.y};
          socketIo.emit('server:onestep', return_message);
        }
      }
    } else {
      if(userNameList[from_to.to].isBattle == true){
        var return_message = {from:from_to.to, to:form_to.from, battling:1};
        socketIo.emit('server:reject', return_message);
      }
      else
        socket.broadcast.emit('server:getInvitation', from_to);
    }
  });
  socket.on('client:accept',from_to => {
    userNameList[from_to.from].isBattle = true;
    userNameList[from_to.to].isBattle = true;
    socket.broadcast.emit('server:accept', from_to);
  });
  socket.on('client:reject', from_to => {
    socket.broadcast.emit('server:reject', from_to);
  });

});
export default app;

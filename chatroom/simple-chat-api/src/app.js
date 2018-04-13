import http from 'http';
import express from 'express';
import cors from 'cors';
import io from 'socket.io';
import config from '../config/config.json';
import path from 'path';

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

//var userNameList = []
var userNameList = [];
var user_key = 0;
// Setup socket.io
socketIo.on('connection', socket => {
  let defaultImageUrl = 'https://thebenclark.files.wordpress.com/2014/03/facebook-default-no-profile-pic.jpg';
  const username = socket.handshake.query.username;
  const u_key = user_key;
  let newuser = {name: `${username}`, url:defaultImageUrl, user_key: user_key};
  user_key++;
  userNameList.push(newuser);
  console.log(`${username} connected`);
  socket.broadcast.emit('server:returnAllUser', userNameList);
  socket.emit('server:first_return', {userNameList: userNameList, user_key:newuser.user_key});
  socket.on('client:message', data => {
    console.log(`${data.username}: ${data.message}`);
    socket.broadcast.emit('server:message', data);
  });

  socket.on('client:getAllUser', () => {
    socket.emit('server:returnAllUser', userNameList);
  });
  socket.on('updateuserinfo', userinfo => {
    userNameList = userinfo;
    socket.broadcast.emit('server:returnAllUser', userNameList);
  });

  socket.on('client:onestep', message => {
    socket.broadcast.emit('server:onestep', message);
  });
  socket.on('disconnect', () => {
    userNameList = userNameList.filter((v, i) => (v.user_key != u_key))
    console.log(`${username} disconnected`);
    socket.broadcast.emit('server:returnAllUser', userNameList);
  });

  socket.on('client:getInvitation', from_to => {
    socket.broadcast.emit('server:getInvitation', from_to);
  });
  socket.on('client:accept',from_to => {
    socket.broadcast.emit('server:accept', from_to);
  });
  socket.on('client:reject', from_to => {
    socket.broadcast.emit('server:reject', from_to);
  });

});

export default app;

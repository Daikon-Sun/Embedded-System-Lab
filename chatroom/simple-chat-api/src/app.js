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

var userNameList = []

// Setup socket.io
socketIo.on('connection', socket => {
  const username = socket.handshake.query.username;
  userNameList.push(`${username}`);
  console.log(`${username} connected`);
  socket.broadcast.emit('server:returnAllUser', userNameList);
  socket.on('client:message', data => {
    console.log(`${data.username}: ${data.message}`);
    // message received from client, now broadcast it to everyone else
    socket.broadcast.emit('server:message', data);
  });

  socket.on('client:getAllUser', () => {
    // message received from client, now broadcast it to everyone else
    socket.emit('server:returnAllUser', userNameList);
  });

  socket.on('client:onestep', message => {
    // message received from client, now broadcast it to everyone else
    socket.emit('server:onestep', message);
  });
  socket.on('disconnect', () => {
    console.log(`${username} disconnected`);
    userNameList = userNameList.filter((v, i) => (v != `${username}`))
    console.log(userNameList);
    socket.broadcast.emit('server:returnAllUser', userNameList);
  });

  socket.on('client:getInvitation', from_to => {
    socket.broadcast.emit('server:getInvitation', from_to);
  });
  socket.on('client:accept',from_to => {
    socket.broadcast.emit('server:accept', from_to);
  });

});

export default app;

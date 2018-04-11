//require('../styles/ChatLobby.css');

import React from 'react';
import io from 'socket.io-client';
import config from '../config';

class ChatLobby extends React.Component {

  socket = {};

  constructor(props) {

    super(props);
    this.state = {userNameList: []};

    // Connect to the server
    this.socket = io(config.api, { query: `username=${props.username}` }).connect();

    // Listen for messages from the server
    this.socket.on('server:returnAllUser', userNameList => {
      this.setState({userNameList});
    });

    this.socket.emit('client:getAllUser', {});
  }

  render() {
    return (
      <div> {
        this.state.userNameList.map((v, i) => (<div key={i}>{v}</div>) )
      } </div>
    );
  }

}
ChatLobby.defaultProps = {
  username: 'Anonymous'
};

export default ChatLobby;

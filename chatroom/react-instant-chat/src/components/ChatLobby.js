require('../styles/ChatLobby.css');

import React from 'react';
import { Grid, Row, Col } from 'react-bootstrap';
import io from 'socket.io-client';

import config from '../config';
import Messages from './Messages';
import ChatInput from './ChatInput';

import Go from './Go';

class ChatLobby extends React.Component {

  socket = {};

  constructor(props) {

    super(props);
    this.state = {userNameList: [], messages: []};
    this.sendHandler = this.sendHandler.bind(this);

    // Connect to the server
    this.socket = io(config.api, { query: `username=${props.username}` }).connect();

    // Listen for messages from the server
    this.socket.on('server:returnAllUser', userNameList => {
      this.setState({userNameList});
    });

    this.socket.emit('client:getAllUser', {});

    this.socket.on('server:message', message => {
      this.addMessage(message);
    });
  }

  sendHandler(message) {
    const messageObject = {
      username: this.props.username,
      message
    };
    // Emit the message to the server
    this.socket.emit('client:message', messageObject);
    messageObject.fromMe = true;
    this.addMessage(messageObject);
  }

  addMessage(message) {
    // Append the message to the component state
    const messages = this.state.messages;
    messages.push(message);
    this.setState({ messages });
  }

  render() {
    return (
        <Grid fluid>
          <Row>
            <Col md={10}>
              <div className="container">
                <h3>React Chat App</h3>
                <Messages messages={this.state.messages} />
                <ChatInput onSend={this.sendHandler} />
              </div>
            </Col>
            <Col md={2}>
              <div> {
                this.state.userNameList.map((v, i) => (<div key={i}>{v}</div>) )
              } </div>
            </Col>
          </Row>
        </Grid>
    );
  }
}

ChatLobby.defaultProps = {
  username: 'Anonymous'
};

export default ChatLobby;

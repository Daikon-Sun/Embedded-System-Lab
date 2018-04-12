require("babel-core/register");
require("babel-polyfill");
require('../styles/ChatLobby.css');

import React from 'react';
import { Grid, Row, Col, Modal, FormGroup, FormControl, HelpBlock, Button } from 'react-bootstrap';
import io from 'socket.io-client';

var imageExists = require('image-exists');
//import isImageUrl from 'is-image-url';
//var imageExtensions = require('image-extensions');

import config from '../config';
import Messages from './Messages';
import ChatInput from './ChatInput';
import Go from './Go';


class ChatLobby extends React.Component {

  socket = {};

  constructor(props) {

    super(props);

    this.defaultImageUrl = 'https://thebenclark.files.wordpress.com/2014/03/facebook-default-no-profile-pic.jpg';
    this.state = {
      usernameList: [], messages: [], isBattle: false,
      showSelection: false, imageUrl: this.defaultImageUrl,
      validImageUrl: 'success'
    };

    // Connect to the server
    this.socket = io(config.api, {query: `username=${props.username}`}).connect();

    // Listen for messages from the server
    this.socket.on('server:returnAllUser', usernameList => {
      this.setState({usernameList});
    });

    this.socket.emit('client:getAllUser', {});

    this.socket.on('server:message', message => {
      this.addMessage(message);
    });
  }

  sendHandler = (message) => {
    const messageObject = {
      username: this.props.username,
      message
    };
    // Emit the message to the server
    this.socket.emit('client:message', messageObject);
    messageObject.fromMe = true;
    this.addMessage(messageObject);
  }

  addMessage = (message) => {
    // Append the message to the component state
    const messages = this.state.messages;
    messages.push(message);
    this.setState({ messages });
  }

  clickType = (name) => {
    if (name == `${this.props.username}`)
      this.setState({showSelection: true});
    else
      this.setState({isBattle: true});
  }

  printAllUser = (v, i) => {
    return (
      <Row key={i} className="signature" onClick={() => this.clickType(v)}>
        <Col md={3} className="personal-figure">
          <img src={this.state.imageUrl} width='39.8em' height='39.8em'/>
        </Col>
        <Col md={9} className="personal-name">
          {v}
        </Col>
      </Row>
    )
  }
  handleChange = (e) => {
    imageExists(
      e.target.value,
      (exists) => {
        if (exists) this.setState({validImageUrl: 'success'});
        else this.setState({validImageUrl: 'error'});
      }
    );
    if (this.state.validImageUrl == 'success')
      this.setState({imageUrl: e.target.value});
    else
      this.setState({imageUrl: this.defaultImageUrl});
  }
  handleClose = () => {
    this.setState({imageUrl: this.defaultImageUrl, showSelection: false});
  }

  clickSave = () => {
    this.defaultImageUrl = this.state.imageUrl;
    this.setState({imageUrl: this.state.imageUrl, showSelection: false});
  }

  render() {
    if (this.state.isBattle) {
      return (
        <div>
          <Go />
        </div>
      );
    }
    return (
      <Grid fluid>
        <Modal show={this.state.showSelection} onHide={this.handleClose}>

          <Modal.Header closeButton>
            <Modal.Title>Please paste your image url</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <form>
              <FormGroup controlId="imageUrl" validationState={this.state.validImageUrl} >
                <FormControl
                  type="text"
                  defaultValue={""}
                  placeholder="Paste image url..."
                  onChange={this.handleChange}
                />
                <FormControl.Feedback />
                <HelpBlock>Your cover photo will be changed to the image url.</HelpBlock>
              </FormGroup>
            </form>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.handleClose}> Close </Button>
            <Button bsStyle="primary" onClick={this.clickSave} >Save changes</Button>
          </Modal.Footer>

        </Modal>
        <Row>
          <Col md={10}>
            <div className="container" id="Lobby">
              <h3>Lobby</h3>
              <Messages messages={this.state.messages} />
              <ChatInput onSend={this.sendHandler} />
            </div>
          </Col>
          <Col md={2}> {
            this.state.usernameList.map(this.printAllUser)
          } </Col>
        </Row>
      </Grid>
    );
  }
}

ChatLobby.defaultProps = {
  username: 'Anonymous'
};

export default ChatLobby;

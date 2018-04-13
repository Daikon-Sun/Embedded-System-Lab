require("babel-core/register");
require("babel-polyfill");
require('../styles/ChatLobby.css');

import React from 'react';
import { Grid, Row, Col, Modal, FormGroup, FormControl, HelpBlock,
  Button, ButtonGroup } from 'react-bootstrap';
import io from 'socket.io-client';

var imageExists = require('image-exists');
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
      usernameList: [], messages: [], color: 0, isBattle: false,
      showSelectImageUrl: false, imageUrl: this.defaultImageUrl,
      validImageUrl: 'success', opponent: "",
      showInvitation: false, showNoMoreInvite: false
    };

    // Connect to the server
    this.socket = io(config.api, {query: `username=${props.username}`}).connect();

    // Listen for messages from the server
    this.socket.on('server:returnAllUser', usernameList => {
      this.setState({usernameList});
    });
    this.socket.on('server:getInvitation', from_to => {
      if (from_to.to == this.props.username) {
        this.setState({
          opponent: from_to.from, showInvitation: true,
          color: from_to.color
        });
      }
    });

    this.socket.on('server:accept', from_to => {
      if (from_to.to == this.props.username)
        this.setState({isBattle: true});
    });
    this.socket.on('server:reject', from_to => {
      if (from_to.to == this.props.username) {
        this.setState({showReject: true});
        this.state.opponent = "";
      }
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
      this.setState({showSelectImageUrl: true});
    else if (this.state.opponent == "")
      this.setState({showSelectBattle: true, opponent: name});
    else
      this.setState({showNoMoreInvite: true});
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

  changeSelectImageUrl = (e) => {
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

  invite = (color) => {
    this.setState({color, showSelectBattle: false});
    this.socket.emit(
      'client:getInvitation',
      {from: this.props.username, to: this.state.opponent, color: 3-color}
    );

  }
  accept = (color) => {
    this.setState({isBattle: true});
    this.socket.emit('client:accept', {from: this.props.username, to: this.state.opponent});
  };
  reject = (color) => {
    this.setState({opponent: "", color: 0, showInvitation: false});
    this.socket.emit('client:reject', {from: this.props.username, to: this.state.opponent});
  }
  closeSelectImageUrl = () => {
    this.setState({imageUrl: this.defaultImageUrl, showSelectImageUrl: false});
  }
  closeSelectBattle = () => {
    this.setState({showSelectBattle: false, opponent: ""});
  }
  closeInvitation = () => {
    this.setState({showInvitation: false, opponent: ""});
  }
  closeReject = () => {
    this.setState({showReject: false});
  }
  closeNoMoreInvite = () => {
    this.setState({showNoMoreInvite: false});
  }
  clickSave = () => {
    this.defaultImageUrl = this.state.imageUrl;
    this.setState({imageUrl: this.state.imageUrl, showSelectImageUrl: false});
  }

  render() {
    if (this.state.color && this.state.isBattle) {
      console.log(this.props);
      return (
        <div>
          <Go player={this.props.username} opponent={this.state.opponent} color={this.state.color} socket={this.socket}/>
        </div>
      );
    }
    return (
      <Grid fluid>
        <Modal show={this.state.showSelectImageUrl} onHide={this.closeSelectImageUrl}>

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
                  onChange={this.changeSelectImageUrl}
                />
                <FormControl.Feedback />
                <HelpBlock>Your cover photo will be changed to the image url.</HelpBlock>
              </FormGroup>
            </form>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.closeSelectImageUrl}> Close </Button>
            <Button bsStyle="primary" onClick={this.clickSave} >Save changes</Button>
          </Modal.Footer>

        </Modal>

        <Modal show={this.state.showSelectBattle} onHide={this.closeSelectBattle}>
          <ButtonGroup vertical block>
            <Button bsSize="lg" onClick={() => this.invite(1)}>
              Play against user {this.state.opponent} as BLACK
            </Button>
            <Button bsSize="lg" onClick={() => this.invite(2)}>
              Play against user {this.state.opponent} as WHITE
            </Button>
          </ButtonGroup>
        </Modal>

        <Modal show={this.state.showInvitation} onHide={this.closeInvitation}>
          <Modal.Header closeButton>
            <Modal.Title>Do you want to play againt {this.state.opponent} as {this.state.color == 1 ? "BLACK" : "WHITE"} </Modal.Title>
          </Modal.Header>
          <ButtonGroup vertical block>
            <Button bsSize="lg" onClick={this.accept}>
              Accept !
            </Button>
            <Button bsSize="lg" onClick={this.reject}>
              Reject !
            </Button>
          </ButtonGroup>
        </Modal>

        <Modal show={this.state.showReject} onHide={this.closeReject}>
          <Modal.Header closeButton>
            <Modal.Title>
              Rejection!
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            You are rejected by {this.state.opponent} !
          </Modal.Body>
        </Modal>

        <Modal show={this.state.showNoMoreInvite} onHide={this.closeNoMoreInvite}>
          <Modal.Header closeButton>
            <Modal.Title>
              You cannot invite more than one player!
            </Modal.Title>
          </Modal.Header>
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

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
    this.lastValidImageUrl = null;
    this.state = {
      usernameList: [],
      user_key: null,
      messages: [], color: 0, isBattle: false,
      showSelectImageUrl: false,
      validImageUrl: null, opponent: null, pre_opponent:null,
      showInvitation: false, showNoMoreInvite: false,
      opponent_battling:false
    };

    this.socket = io(config.api, {query: `username=${props.username}`}).connect();

    this.socket.on('server:returnAllUser', usernameList => {
      this.setState({usernameList:usernameList});
    });
    this.socket.on('server:getInvitation', from_to => {
      if (from_to.to == this.state.user_key) {
        this.setState({
          opponent: from_to.from, showInvitation: true,
          color: from_to.color
        });
      }
    });
    this.socket.on('server:first_return', m =>{
      this.setState({usernameList:m.userNameList, user_key:m.user_key});
    });

    this.socket.on('server:accept', from_to => {
      if (from_to.to == this.state.user_key)
        this.setState({isBattle: true});
    });
    this.socket.on('server:reject', from_to => {
      if (from_to.to == this.state.user_key) {
        this.setState({showReject: true, pre_opponent:this.state.opponent, opponent:null});
        if (from_to.battling==1)
          this.setState({opponent_battling:true});
        else
          this.setState({opponent_battling:false});
      }
    });

    this.socket.on('server:message', message => { this.addMessage(message); });
    this.socket.on('server:loginUser', message => { this.addMessage(message); });
    this.socket.on('server:logoutUser', message => {
      this.addMessage(message);
      if (message.user_key == this.state.opponent) {
        //this.setState({isBattle: false, color: 0, opponent: null});
      }
    });
  }

  sendHandler = (message) => {
    const messageObject = {
      username: this.props.username,
      message
    };
    this.socket.emit('client:message', messageObject);
    messageObject.fromMe = true;
    this.addMessage(messageObject);
  }

  addMessage = (message) => {
    const messages = this.state.messages;
    messages.push(message);
    this.setState({ messages });
  }

  clickType = (key) => {
    if (key == this.state.user_key) {
      this.state.validImageUrl = null;
      this.setState({showSelectImageUrl: true});
    } else if (this.state.opponent == null)
      this.setState({showSelectBattle: true, opponent: key});
    else
      this.setState({showNoMoreInvite: true});
  }

  printAllUser = (v, i) => {
    return (
      <Row key={i} className="signature" onClick={() => this.clickType(v.user_key)}>
        <Col sm={3} md={3} className="personal-figure">
          <img src={v.url} width='39.8em' height='39.8em'/>
        </Col>
        <Col sm={9} md={9} className="personal-name">
          {v.name}
        </Col>
      </Row>
    )
  }

  changeSelectImageUrl = (e) => {
    e.persist();
    imageExists(
      e.target.value,
      (exists) => {
        if (exists) {
          this.lastValidImageUrl = e.target.value;
          this.setState({validImageUrl: "success"});
        }
        else
          this.setState({validImageUrl: "warning"});
      }
    );
  }

  invite = (color) => {
    this.setState({color, showSelectBattle: false});
    this.socket.emit(
      'client:getInvitation',
      {from: this.state.user_key, to: this.state.opponent, color: 3-color}
    );

  }
  accept = (color) => {
    this.setState({isBattle: true, showInvitation: false});
    this.socket.emit('client:accept', {from: this.state.user_key, to: this.state.opponent});
  };
  reject = (color) => {
    this.setState({opponent: null, color: 0, showInvitation: false});
    this.socket.emit('client:reject', {from: this.state.user_key, to: this.state.opponent, battling:0});
  }
  rejectMessage = () => {
    // return (<Modal.Body>{this.getName(this.state.pre_opponent)} is battling !</Modal.Body>);
    if(this.state.opponent_battling)
      return (<Modal.Body>{this.getName(this.state.pre_opponent)} is battling !</Modal.Body>);
    else
      return (<Modal.Body>You are rejected by {this.getName(this.state.pre_opponent)} !</Modal.Body>);
  }
  closeSelectImageUrl = () => {
    this.setState({showSelectImageUrl: false});
  }
  closeSelectBattle = () => {
    this.setState({showSelectBattle: false, opponent: null});
  }
  closeInvitation = () => {
    this.setState({showInvitation: false, opponent: null});
  }
  closeReject = () => {
    this.setState({showReject: false});
  }
  closeNoMoreInvite = () => {
    this.setState({showNoMoreInvite: false});
  }
  clickSave = () => {
    if (this.lastValidImageUrl) {
      this.state.usernameList[this.state.user_key].url = this.lastValidImageUrl;
      this.setState({usernameList:this.state.usernameList, showSelectImageUrl:false});
      this.socket.emit('updateuserinfo', this.state.usernameList);
    }
  }
  endBattle = () => {
    this.setState({isBattle: false, opponent: null, color: 0});
    this.socket.emit('client:exit', {user:this.state.user_key});
  }
  getName = (key) => {
    if (this.state.usernameList[key]) {
      return this.state.usernameList[key].name;
    }
  }

  render() {
    if (this.state.color && this.state.isBattle) {
      return (
        <div>
          <Go player={this.state.user_key}
              opponent={this.state.opponent}
              color={this.state.color}
              socket={this.socket}
              getName={this.getName}
              endBattle={this.endBattle}/>
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
                  onChange={this.changeSelectImageUrl} autoFocus
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
              Play against user {this.getName(this.state.opponent)} as BLACK
            </Button>
            <Button bsSize="lg" onClick={() => this.invite(2)}>
              Play against user {this.getName(this.state.opponent)} as WHITE
            </Button>
          </ButtonGroup>
        </Modal>

        <Modal show={this.state.showInvitation} onHide={this.closeInvitation}>
          <Modal.Header closeButton>
            <Modal.Title>Do you want to play againt {this.getName(this.state.opponent)} as {this.state.color == 1 ? "BLACK" : "WHITE"} </Modal.Title>
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
          {this.rejectMessage()}
        </Modal>

        <Modal show={this.state.showNoMoreInvite} onHide={this.closeNoMoreInvite}>
          <Modal.Header closeButton>
            <Modal.Title>
              You cannot invite more than one player!
            </Modal.Title>
          </Modal.Header>
        </Modal>

        <Row>
          <Col xs={9} sm={9} md={9}>
            <div className="container" id="Lobby">
              <h3>Go Chat Lobby</h3>
              <Messages messages={this.state.messages} />
              <ChatInput onSend={this.sendHandler} />
            </div>
          </Col>
          <Col xs={3} sm={3} md={3}> {
            Object.values(this.state.usernameList).map(this.printAllUser)
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

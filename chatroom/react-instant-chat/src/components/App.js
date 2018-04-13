require('../styles/App.css');
require('../styles/Login.css');

import React from 'react';
import ChatLobby from './ChatLobby';

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = { username: '', submitted: false };

    // Bind 'this' to event handlers. React ES6 does not do this by default
    this.usernameChangeHandler = this.usernameChangeHandler.bind(this);
    this.usernameSubmitHandler = this.usernameSubmitHandler.bind(this);
  }

  usernameChangeHandler(event) {
    this.setState({ username: event.target.value });
  }

  usernameSubmitHandler(event) {
    event.preventDefault();
    this.setState({ submitted: true, username: this.state.username });
  }

  render() {

    if (this.state.submitted) {
      return (
        <ChatLobby username={this.state.username} imageUrl={'.com'}/>
      )
    }

    return (
      <form onSubmit={this.usernameSubmitHandler} className="username-container">
        <h1>Go Chat</h1>
        <div>
          <input
            type="text"
            onChange={this.usernameChangeHandler}
            placeholder="Enter a username..."
            required autoFocus/>
        </div>
        <input type="submit" value="Submit" />
      </form>
    );
  }

}
App.defaultProps = {
};

export default App;

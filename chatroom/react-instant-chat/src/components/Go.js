require('../styles/go.css')

import React from 'react';

class Go extends React.Component {

  constructor(props) {
    super(props);
    let e = new Array(19);
    for(let i=0;i<19;i++){
      e[i] = new Array(19);
      for(let j=0;j<19;j++){
        e[i][j]=0
      }
    }
    this.state = {
      player:0,
      playboard:e
    };

    this.gostep = this.gostep.bind(this)
    this.drawcanvas = this.drawcanvas.bind(this);
    this.updatego = this.updatego.bind(this);
  }
  
  updatego(){
    
  
  }
  drawcanvas(){
    
  }
    
  gostep(){
    //this.updatego(pos)
    //this.drawcanvas()
    this.setState({player:(this.state.player+1)%2});
  }

  render() {
    return(
      <div id='go-board' onClick={this.gostep}>
        hihi {this.state.player}
      </div>
    );
  }

}

export default Go;


require('../styles/go.css')

import React from 'react';



class Go extends React.Component {
  constructor(props) {
    super(props);
    let ss = 19;
    let e = new Array(ss);
    for(let i=0;i<ss;i++){
      e[i] = new Array(ss);
      for(let j=0;j<ss;j++){
        e[i][j]=0;
      }
    }
    let myturn = 0;
    if(this.props.color == 1)
      myturn = 1;
    this.state = {
      test:false,
      player:this.props.player,
      opponent:this.props.opponent,
      color:this.props.color,
      myturn:myturn,
      board:e,
      ko:[],
      pass:0
    };

    this.props.socket.on('server:onestep', message => {this.getstep(message)})
  }

  findneighbor = (point, b, m, n) => {
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
  eat = (p, b) => {
    if(b[p.x][p.y] == 0)
      return {eat:false, area:[], border:[]};
    let m = b[p.x][p.y];
    let n = m%2+1;
    let {area, border} = this.findneighbor(p, b, m, n);
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
  updatego = (p) => {
    let x = p.x;
    let y = p.y;
    let b = this.state.board;
    // check empty
    if(b[x][y]!= 0){
      console.log('not empty');
      return {update:false, ko_h:[]};
    }
    b[x][y] = this.state.color;
    
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
      if(b[tx][ty] == (0 || this.state.color))
        continue;
      let {eat, area, border} = this.eat({x:tx, y:ty}, b);
      if(eat==false){
        continue;
      }
      // if not in enten yet, eat it!!
      for(let j = 0; j < area.length; j++)
        if(!eaten.find(e =>(e.x === area[j].x && e.y === area[j].y)))
          eaten.push(area[j]);
    }
    if(eaten.length > 0){
      if(eaten.length == 1){
        if((this.state.ko.length==1) && (eaten[0].x == this.state.ko[0].x && eaten[0].y == this.state.ko[0].y)){
          console.log("ko!!");
          b[x][y] = 0;
          return {update:false, ko_h:[]};
        }
        ko_h = [p];
      }
      for(let i = 0; i < eaten.length; i++)
        b[eaten[i].x][eaten[i].y] = 0;
    }
    else{// check unavailable position
      let {eat, area, border} = this.eat({x:x, y:y}, b);
      if(eat==true){
        console.log('Unavailable position!');
        b[x][y] = 0;
        return {update:false, ko_h:[]};
      }
      ko_h = [];
    }
    console.log("ko_h", ko_h);
    this.setState({board:b})
    if(this.state.test){
        this.setState({ko:ko_h});
    }
    return {update:true, ko_h:ko_h};
  }
  drawstones = () => {
    let bx = 0.3;
    let by = 0.1;
    let ww = 23;
    return this.state.board.map((vv, i)=>(vv.map((v,j)=>(<button key={i*19+j} id={i*19+j} onClick={this.gostep} className={'gobutton gobutton-' + `${v}`} style={{top: bx+ww*i + 'px', left: by+ww*j + 'px'}}></button>))));
  }
  
  getstep = (m) => {
    console.log("getstep", m);
    if((m.player != this.state.opponent) || (m.opponent != this.state.player))
      return;
    console.log(m.pass);
    if(m.pass == 1){
      this.setState({pass: 1});
    }  
    else if (m.pass >= 2){
      this.setState({pass: 2});
    }
    else
      this.setState({pass: 0});
    this.setState({board:m.board, myturn:1, ko:m.ko});
    this.drawstones();
  }
  gostep = (e) => {
    if(this.state.pass >= 2){
      console.log('Game end');
      return;
    }
    if(this.state.myturn==0){
      console.log('Not your turn!');
      return;
    }
    let ID = e.target.id;
    let y = ID % 19;
    let x = (ID - y) / 19;
    let s = this.updatego({x,y});
    console.log("s.ko_h:", s.ko_h);
    if(!s.update)
      return;
    if(this.state.test){
      this.setState({color:this.state.color%2+1});
    }
    else{
      this.setState({myturn:0});
      this.props.socket.emit('client:onestep', {player: this.state.player, opponent: this.state.opponent, board:this.state.board, ko:s.ko_h, pass:0});
    }
    this.drawstones();
  }
  
  turn = () => {
    if(this.state.pass >= 2){
      return (<div className={'go-main-turn'} onClick={this.props.endBattle}> END GAME </div>);
    }
    else if(this.state.myturn == 1 && this.state.pass == 1){
      return (<div className={'go-main-turn'}> OPPONENTS PASS </div>);
    }
    else if(this.state.myturn == 1)
      return (<div className={'go-main-turn'}> YOUR TURN </div>);
    else
      return (<div className={'go-main-turn'}> OPPONENTS TURN </div>);
  }
  
  pass_click = () => {
    console.log("pass_clicked");
    if(this.state.myturn == 0){
      console.log('Not your turn');
      return;
    }
    let k = this.state.pass;
    this.props.socket.emit('client:onestep', {player: this.state.player, opponent: this.state.opponent, board:this.state.board, ko:[], pass: this.state.pass+1})
    console.log("pass now:", k+1);
    this.setState({pass:k+1, myturn:0});
  }

  render() {
    return(
      <div> 
        <div id='go-board'>
          <div id='board'>
            {this.drawstones()}
          </div>
        </div>
        <div id='go-screen'>
          {this.turn()}
          <div id='pass-button' className={'go-main-turn'} onClick={this.pass_click}>PASS</div>
        </div>
      </div>
    );
  }

}

export default Go;


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
    this.state = {
      test:true,
      player:2,
      myturn:1,
      board:e
    };

    this.gostep = this.gostep.bind(this)
    this.drawstones = this.drawstones.bind(this);
    this.updatego = this.updatego.bind(this);
    this.getstep = this.getstep.bind(this)
    this.findneighbor = this.findneighbor.bind(this);
    this.eat = this.eat.bind(this);
    //this.props.socket.on('server:onestep', message => {this.getstep(message)})
  }

  findneighbor(point, b, m, n){
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
  eat(p, b){
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
  updatego(p){
    let x = p.x;
    let y = p.y;
    let b = this.state.board;
    // check empty
    console.log(x, y);
    if(b[x][y]!= 0){
      console.log('not empty');
      return false;
    }
    b[x][y] = this.state.player;
    
    let eaten = [];
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
      if(b[tx][ty] == (0 || this.state.player))
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
      for(let i = 0; i < eaten.length; i++)
        b[eaten[i].x][eaten[i].y] = 0;
    }
    else{// check unavailable position
      let {eat, area, border} = this.eat({x:x, y:y}, b);
      if(eat==true){
        console.log('Unavailable position!');
        b[x][y] = 0;
        return false;
      }
    }
    //this.setState({board:b})
    return true;
  }
  drawstones(){
    //return (<div>yoyo0</div>);
    let bx = 0.3;
    let by = 0.1;
    let ww = 23;
    return this.state.board.map((vv, i)=>(vv.map((v,j)=>(<button key={i*19+j} id={i*19+j} onClick={this.gostep} className={'gobutton gobutton-' + `${v}`} style={{top: bx+ww*i + 'px', left: by+ww*j + 'px'}}></button>))));
  }
  
  getstep(m){
    if(m.player==this.state.player)
      return;
    this.setState({board:m.board, myturn:1});
  }
  gostep(e){
    if(this.state.myturn==0){
      console.log('Not your turn!');
      return;
    }
    let ID = e.target.id;
    let y = ID % 19;
    let x = (ID - y) / 19;
    if(!this.updatego({x,y}))
      return;
    if(this.state.test){
      this.setState({player:this.state.player%2+1});
    }
    //this.setState({myturn:0});
    //this.props.socket.emit('client:onestep', {player: this.state.player, board:this.state.board});
    this.drawstones();
  }

  render() {
    return(
      <div id='go-board'>
        <div id='board'>
          {this.drawstones()}
        </div>
      </div>
    );
  }

}

export default Go;


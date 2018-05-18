const tessel = require('tessel');
const accel = require('accel-mma84').use(tessel.port.B);
const rfidlib = require('rfid-pn532');
const rfid = rfidlib.use(tessel.port.A);
const pty = require('node-pty');
var chart = require('chart-stream')(function (url) {
  console.log('Open %s in your browser to see the chart', url)
})

// [ 800, 400, 200, 100, 50, 12.5, 6.25, 1.56 ] Hz
const rate = accel.availableOutputRates()[0];
accel.setOutputRate(rate);
const resetThres = rate / 8;
// [ 2, 4, 8 ] Gs
const range = accel.availableScaleRanges()[2];
accel.setScaleRange(range); 
const freezeRange = 0.35;
const moveRange = 0.65;
const maxHist = 50;
const histRate = 40;

// Initialize
var cntHist = 0;
var music = null;
chart.write('x,y,z');
mp3_list = []
for (var i = 0; i < 3; ++i)
  mp3_list.push('/mnt/sda/music' + String(i) + '.mp3')
madplay_opt = mp3_list.concat(['-a', -20, '--tty-control']);

var prvX = [], prvZ = [];
accel.on('ready', () => {
  // Stream accelerometer data
  accel.on('data', (xyz) => {
    if (music != null) {
      x = xyz[0], y = xyz[1], z = xyz[2];
      cntHist += 1;
      if (cntHist == histRate) {
        chart.write((x*100) + ',' + (y*100) + ',' + ((z-1)*100));
        cntHist = 0;
      }
      console.log(x, y, z);
      if (Math.abs(x) > moveRange || prvX.length != 0)
        prvX.push(x);
      if (Math.abs(z-1) > moveRange || prvZ.length != 0)
        prvZ.push(z-1);

      if (needReset(prvX)) {
        var numPeak = countPeak(prvX);
        if (numPeak >= 2) {
          music.write('f');
          console.log('next song');
        }
        else if (numPeak == 1) {
          for (var j = 0; j < 4; ++j)
            music.write('+');
          console.log('volume up');
        }
        else if (numPeak == -1) {
          for (var j = 0; j < 4; ++j)
            music.write('-');
          console.log('volume down');
        }
        else if (numPeak <= -2) {
          music.write('b');
          music.write('b');
          console.log('previous song');
        }
        prvX.length = 0;
      }

      if (needReset(prvZ)) {
        var numPeak = Math.abs(countPeak(prvZ));
        if (numPeak >= 2) {
          music.write('p');
          console.log('pause/resume music');
        }
        prvZ.length = 0;
      }

    } else {
      if (prvX.length != 0)
        prvX.length = 0;
      if (prvZ.length != 0)
        prvZ.length = 0;
    }
  });
});

accel.on('error', (err) => { console.log('Error:', err); });

rfid.on('ready', (version) => {
  console.log('Ready to read RFID card');
  rfid.on('data', (card) => {
    if (music == null) {
      music = pty.spawn('madplay', madplay_opt);
      console.log('start playing music!');
    } else {
      console.log('stop playing music!');
      music.write('q');
      music.kill();
      music = null;
    }
    // console.log('UID:', card.uid.toString('hex'));
  });
});
rfid.on('error', (err) => { console.error(err); });

function needReset(prv) {
  if (prv.length < resetThres)
    return false;
  for (var i = prv.length - 1; i >= prv.length - resetThres; --i) {
    if (Math.abs(prv[i]) > freezeRange)
      return false;
  }
  return true;
}

function countPeak(prv) {
  // if (prv.length <= resetThres * 2)
  //   return 0;
  var st = [];
  for (var i = 0; i < prv.length; ++i) {
    if (prv[i] > moveRange)
      st.push(1);
    else if (prv[i] < -moveRange)
      st.push(-1);
  }
  if (st.length == 0)
    return 0;
  var cur = st[0], cnt = 1;
  for (var i = 1; i < st.length; ++i) {
    if (st[i] != cur) {
      ++cnt;
      cur = st[i];
    }
  }
  return Math.floor((cnt - 1) / 2) * st[0];
}

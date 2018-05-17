var tessel = require('tessel');
var accel = require('accel-mma84').use(tessel.port.B);
var rfidlib = require('rfid-pn532');
var rfid = rfidlib.use(tessel.port.A);
var pty = require('node-pty');
var music = null;

// [ 800, 400, 200, 100, 50, 12.5, 6.25, 1.56 ] Hz
var rate = accel.availableOutputRates()[0];
accel.setOutputRate(rate);
var resetThres = rate / 8;
// [ 2, 4, 8 ] Gs
var range = accel.availableScaleRanges()[2];
accel.setScaleRange(range); 
var freezeRange = 0.35;
var moveRange = 0.65;

var prvX = [], prvZ = [];

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

// Initialize the accelerometer.
accel.on('ready', function () {
  // Stream accelerometer data
  accel.on('data', function (xyz) {
    if (music != null) {
      x = xyz[0], z = xyz[2];
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

accel.on('error', function(err){
  console.log('Error:', err);
});

mp3_list = []
for (var i = 0; i < 3; ++i)
  mp3_list.push('/mnt/sda/music' + String(i) + '.mp3')
madplay_opt = mp3_list.concat(['-a', -20, '--tty-control']);

rfid.on('ready', function (version) {
  console.log('Ready to read RFID card');

  rfid.on('data', function(card) {
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

rfid.on('error', function (err) {
  console.error(err);
});

// var fs = require('fs');
// var path = require('path');
// var mountPoint = '/mnt/sda1'; // The first flash drive you plug in will be mounted here, the second will be at '/mnt/sdb1'
// var filepath = path.join(mountPoint, 'myFile.txt');
// 
// var textToWrite = 'Hello Tessel!';
// 
// // Write the text to a file on the flash drive
// fs.writeFile(filepath, textToWrite, function () {
//   console.log('Wrote', textToWrite, 'to', filepath, 'on USB mass storage device.');
// });
// 
// // Read the text we wrote from the file
// fs.readFile(filepath, function (err, data) {
//   console.log('Read', data.toString(), 'from USB mass storage device.');
// });

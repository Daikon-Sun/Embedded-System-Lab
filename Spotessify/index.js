var tessel = require('tessel');
var accel = require('accel-mma84').use(tessel.port.B);
var rfidlib = require('rfid-pn532');
var rfid = rfidlib.use(tessel.port.A);
var pty = require('node-pty');
var music = null;

// Initialize the accelerometer.
accel.on('ready', function () {
  // Stream accelerometer data
  accel.on('data', function (xyz) {
    // console.log(
    //   'x:', xyz[0].toFixed(2),
    //   'y:', xyz[1].toFixed(2),
    //   'z:', xyz[2].toFixed(2)
    // );
  });
});

accel.on('error', function(err){
  console.log('Error:', err);
});

rfid.on('ready', function (version) {
  console.log('Ready to read RFID card');

  rfid.on('data', function(card) {
    if (music == null) {
      music = pty.spawn('madplay', ['/mnt/sda/music.mp3', '-a', -24]);
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

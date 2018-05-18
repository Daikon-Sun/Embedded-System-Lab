// Require
const tessel = require('tessel');
const accel = require('accel-mma84').use(tessel.port.B);
const rfidlib = require('rfid-pn532');
const request = require("request");
const cheerio = require("cheerio");
const rfid = rfidlib.use(tessel.port.A);
const pty = require('node-pty');
const fs = require('fs');
const ytdl = require('ytdl-core');
var mp3_list = [];
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

// Path
const playlist_prefix = 'https://www.youtube.com/playlist?list=';
const watch_prefix = 'https://www.youtube.com/watch?v=';
const music_dir = '/mnt/sdb/music_';

// Initialize
const playlist = [
  'PL6hLX4jbv8SZgIydhJ4CavKJGT9n89v2z',
  'PL6hLX4jbv8SYebYEsq5Vx3Csvs8UhkU6o'
  // 'PL6hLX4jbv8SaJrZbyWi0BaMn27vOgSTIo',
  // 'PL6hLX4jbv8Sa_LCpyiPbiY_H_9X_Ac-MG'
];
var numSongs = [];
chart.write('x,y,z');
var cntHist = 0;
var prvX = [], prvZ = [];
var currentList = 0;
var madplay_opt;
var music = null;
var numDownloadList = 0;

for (var i = 0; i < playlist.length; ++i) {
  downloadList(playlist_prefix + playlist[i], i);
}

function needReset(prv) {
  if (prv.length < resetThres)
    return false;
  for (var i = prv.length - 1; i >= prv.length - resetThres; --i) {
    if (Math.abs(prv[i]) > freezeRange)
      return false;
  }
  return true;
}

function getMP3(hrefs, pid, c, cc) {
  if (c == cc) {
    ++numDownloadList;
    return;
  }
  var fn = music_dir + pid + '_' + c.toString()
  var readStream = ytdl(watch_prefix + hrefs[c], {quality:'lowest', filter:'audioonly'});
  readStream.pipe(fs.createWriteStream(fn + '.mp2'));
  readStream.on('end', function() {
    getMP3(hrefs, pid, c+1, cc);
  });
}

function downloadList(listUrl, pid) {
  request({url: listUrl, method: "GET"}, function(e, r, b) {

    if(e || !b)
      return;
    var $ = cheerio.load(b);
    var hrefs=[];
    $('.pl-video.yt-uix-tile a.pl-video-title-link.yt-uix-tile-link').each(function(i, element) {
      hrefs.push($(this).attr('href').split("&")[0].split("=")[1]);
    })
    numSongs.push(hrefs.length);
    // getMP3(hrefs, pid, 0, hrefs.length);
  });
}
function countPeak(prv) {
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

function updateList(p) {
  if (p)
    currentList = (currentList + 1) % playlist.length;
  else
    currentList = (currentList + playlist.length - 1) % playlist.length;
  updateMP3List();
  music.write('q');
  music.kill();
  music = pty.spawn('madplay', madplay_opt);
  console.log('start playing music!');
}

function updateMP3List() {
  mp3_list.length = 0;
  for (var i = 0; i < numSongs[currentList]; ++i)
    mp3_list.push(music_dir + String(currentList) + '_' + String(i) + '.mp2')
  madplay_opt = mp3_list.concat(['-a', -20, '--tty-control']);
}

accel.on('ready', function() {
  // Stream accelerometer data
  accel.on('data', function(xyz) {
    if (music != null) {
      x = xyz[0], y = xyz[1], z = xyz[2];
      ++cntHist;
      if (cntHist == histRate) {
        chart.write((x*100) + ',' + (y*100) + ',' + ((z-1)*100));
        cntHist = 0;
      }
      // console.log(x, y, z);
      if (Math.abs(x) > moveRange || prvX.length != 0)
        prvX.push(x);
      if (Math.abs(z-1) > moveRange || prvZ.length != 0)
        prvZ.push((z-1) / 1.3);

      if (needReset(prvX)) {
        var numPeak = countPeak(prvX);
        if (numPeak >= 3) {
          console.log('next list');
          updateList(true);
        }
        else if (numPeak == 2) {
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
        else if (numPeak <= -3) {
          updateList(false);
          console.log('previous list');
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

rfid.on('ready', function(version) {
  console.log('Ready to read RFID card');
  rfid.on('data', function(card) {
    // if (numDownloadList != playlist.length) {
    //   console.log('still downloading!');
    //   return;
    // }
    if (music == null) {
      updateMP3List();
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
rfid.on('error', function(err) { console.error(err); });

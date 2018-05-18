const tessel = require('tessel');
const accel = require('accel-mma84').use(tessel.port.B);
const rfidlib = require('rfid-pn532');
const request = require("request");
const cheerio = require("cheerio");
var rfid = rfidlib.use(tessel.port.A);
var pty = require('node-pty');
var music = null;
var mp3_list = [];
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
var dl = new Downloader();
const playlist = [
  "PL6hLX4jbv8SaJrZbyWi0BaMn27vOgSTIo",
  "PL6hLX4jbv8Sa_LCpyiPbiY_H_9X_Ac-MG"
];
const list_prefix = 'https://www.youtube.com/playlist?list=';
var listnum = playlist.length;
var currentlist = 0;
var music_dir = '/mnt/sda/music';
var madplay_opt;
console.log("test");
var YoutubeMp3Downloader = require("youtube-mp3-downloader");

var Downloader = function() {

    var self = this;
    
    //Configure YoutubeMp3Downloader with your settings
    self.YD = new YoutubeMp3Downloader({
        "ffmpegPath": "/usr/bin/ffmpeg",        // Where is the FFmpeg binary located?
        "outputPath": music_dir,    // Where should the downloaded and encoded files be stored?
        "youtubeVideoQuality": "highest",       // What video quality should be used?
        "queueParallelism": 2,                  // How many parallel downloads/encodes should be started?
        "progressTimeout": 2000                 // How long should be the interval of the progress reports
    });

    self.callbacks = {};

    self.YD.on("finished", function(error, data) {
    
        if (self.callbacks[data.videoId]) {
            self.callbacks[data.videoId](error, data);
        } else {
            console.log("Error: No callback for videoId!");
        }
    
    });

    self.YD.on("error", function(error, data) {
  
        console.error(error + " on videoId " + data.videoId);
    
        if (self.callbacks[data.videoId]) {
            self.callbacks[data.videoId](error, data);
        } else {
            console.log("Error: No callback for videoId!");
        }
     
    });

};

Downloader.prototype.getMP3 = function(track, callback){

    var self = this;
  
    // Register callback
    console.log("register");
    self.callbacks[track.videoId] = callback;
    console.log("ready to download");
    // Trigger download
    self.YD.download(track.videoId, track.name);

};

function needReset(prv) {
  if (prv.length < resetThres)
    return false;
  for (var i = prv.length - 1; i >= prv.length - resetThres; --i) {
    if (Math.abs(prv[i]) > freezeRange)
      return false;
  }
  return true;
}


function setlist(n){
  if(music != null){
    music.write('q');
    music.kill();
  }
  mp3_list = [];
  for (var i = 0; i < n; ++i)
    mp3_list.push(music_dir + String(i) + '.mp3')
  madplay_opt = mp3_list.concat(['-a', -20, '--tty-control']);
  music = pty.spawn('madplay', madplay_opt);
  console.log('start playing music!');
}
function downloadlist(listurl, dl){
request({
  url: listurl,
  method: "GET"
},function(e, r, b){
  if(e || !b){return;}
  var $ = cheerio.load(b);
  var hrefs=[];
  $('.pl-video.yt-uix-tile a.pl-video-title-link.yt-uix-tile-link').each(function(i, element){
    var a = $(this);
    hrefs.push($(this).attr('href').split("&")[0].split("=")[1]);
  })
  //console.log(hrefs);
  let count = hrefs.length;
  for(var i = 0; i < hrefs.length; i++){
    dl.getMP3({videoId: hrefs[i], name: ("music_"+i.toString()+".mp3")}, function(err,res){
      console.log("getMP3");
      if(err)
        throw err;
      else{
        let name = res.file.toString().split("/");
        console.log("Song was downloaded: " + res.file);
        count--;
        if(count == 0)
          setlist(song_num);
      }
    });
  }
  console.log("Finish all download!");
  return hrefs.length;
})}

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

function getlisturl(p){
  if(p)
    currentlist = (currentlist + 1) % listnum;
  else
    currentlist = (currentlist + listnum - 1) % listnum;
  return playlist(currentlist); 
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
        if (numPeak >= 3) {
          console.log('next list');
          list = getlisturl(true);
          downloadlist(list, music_dir, dl);
          console.log('continue!');
          console.log('will go to next list----------');
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
          list = getlisturl(false);
          song_num = downloadlist(list, music_dir, dl);
          console.log('continue!');
          setlist(song_num);
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

song_num = downloadlist(playlist[0], music_dir, dl);
console.log("yoyo");
setlist(song_num);
accel.on('error', function(err){
  console.log('Error:', err);
});
<<<<<<< HEAD
=======

mp3_list = []
for (var i = 0; i < 3; ++i)
  mp3_list.push('/mnt/sda/music' + String(i) + '.mp3')
madplay_opt = mp3_list.concat(['-a', -20, '--tty-control']);

>>>>>>> refs/remotes/origin/master
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


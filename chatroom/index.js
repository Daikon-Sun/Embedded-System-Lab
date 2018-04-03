const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.get('/', function(req, res){
    var home = "<div id='chatroombox'><div id='userlist' style='color:red;'>hi</div><div id='chatarea'>yo</div></div>"
    res.send(home);
})
var server = app.listen(3000, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Example app listening at http://%s:%s", host, port)
   //console.log("Example app listening at")
})

/*
app.use(bodyParser.json());
app.get('/info', function(req, res){
    res.set('Content-Type', 'application/json')
    res.send(JSON.stringify({
        message: 'Done',
    }));
    res.end();
});
app.post('/login', function(req, res){
    res.set('Content-Type', 'application/json')
    res.send(JSON.stringify({
        data: req.body,
    }));
    res.end();


});
*/

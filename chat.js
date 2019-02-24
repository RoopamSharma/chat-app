var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var session = require('express-session')
const bodyParser = require('body-parser');
app.get('/', function(req, res){
  res.sendFile(__dirname + '/chat.html');
});
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}))

app.post('/addname', function(req, res){
  console.log(req.body);
  req.session.username = req.body.name;
  res.send("added: "+req.session.username);
});

app.post('/checkname', function(req, res){
  console.log(req.session.username);
  res.send(req.session.username);
});

io.on('connection', function(socket){
  console.log('user connected');
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
  socket.on('disconnect', function(msg){
    console.log(socket.id);
    io.emit('chat message','someone left');
    console.log('user disconnected');
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

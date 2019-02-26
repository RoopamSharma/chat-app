var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var session = require('express-session')
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

const url = 'mongodb://localhost:27017';
const dbName = 'mydb';


app.use(bodyParser.urlencoded({
    extended: true
}));

app.io = io;
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

app.get('/', function(req, res){
  console.log('user connected');
  res.sendFile(__dirname + '/chat.html');
});

app.post('/addname', function(req, res){
  var name = req.body.name;
  req.session.username = name;
  req.app.io.emit('addtab',name);
  res.send("added: "+name);
});

app.post('/checkname', function(req, res){
  res.send(req.session.username);
});

io.on('connection', function(socket){
  socket.on('addtab',function(name){
    const dbclient = new MongoClient(url,{useNewUrlParser: true});
    dbclient.connect(function(err) {
      const db = dbclient.db(dbName);
      var obj = {'name':name,'tabid':[socket.id]};
      db.collection("users").find({'name':name}).toArray(function(err,result) {
          if (err) throw err;
          for(var i=0;i<result.length;i++){
            console.log("name: "+result[i]['name']);
              if(result[i]['name']==name){
                obj['tabid'] = socket.id;
                //send message to result[i]['tabid'] to redirect to other.html
                break;
              }
          }
          console.log("new object: ");
          console.log(obj);
          db.collection("users").insertOne(obj, function(err,res) {
              if (err) throw err;
                console.log("1 document inserted");
          });
          dbclient.close();
          });
    });
  });

  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
  socket.on('disconnect', function(){
    console.log('disconnected: '+socket.id);
    io.emit('chat message','someone left');
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

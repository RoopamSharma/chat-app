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

// to access socket in url handling
app.io = io;

// initializing session
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

// default page
app.get('/', function(req, res){
  console.log('user connected');
  res.sendFile(__dirname + '/chat.html');
});

// register current user name to session
app.post('/addname', function(req, res){
  var name = req.body.name;
  req.session.username = name;
  req.session.currtab = req.body.socket_id;
  req.app.io.to(req.body.socket_id).emit('addtab',name);
  res.send("added: "+name);
});

app.post('/addtabinsession',function(req,res){
  req.session.currtab = req.body.socket_id;
  res.send("Success");
});

app.post('/rmusersess',function(req,res){
  req.session.username = undefined;
  req.session.currtab = undefined;
  res.send("Success");
});

// check user name in session and redirect previous tab to other.html
app.post('/checkname', function(req, res){
  console.log(req.session.username);
  if(!req.session.username){
    res.send('undefined');
  }
  else if(req.session.username){
    console.log("redirecting: ",req.session.currtab);
    req.app.io.to(req.session.currtab).emit('redirecttab','');
    res.send({'tag': 'redirectedprevtab','name': req.session.username});
  }
  else{
      res.send({'name': req.session.username});
  }
});

app.get('/other',function(req,res){
  res.sendFile(__dirname+"/other.html");
});

io.on('connection', function(socket){
  console.log(socket.id);
  socket.on('addtab',function(name){
    const dbclient = new MongoClient(url,{useNewUrlParser: true});
    dbclient.connect(function(err) {
      const db = dbclient.db(dbName);
      db.collection("users").find({'name':name}).toArray(function(err,result) {
          if (err) throw err;
          var flag = 1;
          for(var i=0;i<result.length;i++){
              if(result[i]['name']==name){
                flag=0;
                var query = {'name':name};
                var newvals = {$set:{'tabid':socket.id}}
                db.collection("users").updateOne(query,newvals, function(err,res) {
                    if (err) throw err;
                      console.log("updated 1 document with");
                      console.log(newvals);
                });
                break;
              }
          }
          if(flag==1){
            var obj = {'name':name,'tabid':[socket.id]};
            console.log("new object: ");
            console.log(obj);
            db.collection("users").insertOne(obj, function(err,res) {
                if (err) throw err;
                  console.log("new document inserted");
            });
          }
          dbclient.close();
          });
    });
  });

  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
  socket.on('disconnect', function(){
    console.log('disconnected: '+socket.id);
    const dbclient = new MongoClient(url,{useNewUrlParser: true});
    dbclient.connect(function(err) {
      const db = dbclient.db(dbName);
      if (err) throw err;
      var myquery = { 'tabid': socket.id };
      db.collection("users").deleteOne(myquery, function(err, obj) {
        if (err) throw err;
        console.log("1 document deleted");
      });
      dbclient.close();
    });
    io.emit('chat message','someone left');
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

var express = require('express');
var http = require('http');
var pg = require('pg').native;
var fs = require('fs');
var app = express();
var server = http.createServer(app);
var html = fs.readFileSync('./index.html');
var bodyParser = require('body-parser')

app.use(bodyParser.json());

var conString = "postgres://bttjzotgxwisqf:6vvG9vGhNRns3RBH7XcoJhqYMc@ec2-184-72-231-67.compute-1.amazonaws.com:5432/daj5aah1m705ur";

app.get('/', function(req, res) {
    
    var client = new pg.Client(conString);
    client.connect();
  
    res.writeHead(200, {'Content-Type': 'text/html'});
  
    var resContent = "<!DOCTYPE html><html><body><h1>Data base content</h1><table style=\"width:300px\">";
  
    var query = client.query("SELECT firstname, lastname FROM emps ORDER BY lastname, firstname");
    query.on("row", function (row, result) {
        result.addRow(row);
    });
    query.on("end", function (result) {
      for( var i=0; i < result.rows.length; i++ ) {
        resContent += "<tr><td>" + result.rows[i].firstname + "</td><td>" + result.rows[i].lastname + "</td></tr>";
      }
      
      resContent += "</table></body></html>";
      res.end(resContent);
      client.end();
    });
  
});

app.post('/post', function(req, res) {
    console.log( req.body.firstname, req.body.lastname );
    var client = new pg.Client(conString);
    client.connect();
    var query = client.query("INSERT INTO emps(firstname, lastname) values($1, $2)", [req.body.firstname, req.body.lastname]);
    query.on('end', client.end.bind(client));
  
    res.send(req.body);    // echo the result back
});

server.listen(3000);
console.log('Express server started on port %s', server.address().port);

// client.query("CREATE TABLE IF NOT EXISTS emps(firstname varchar(64), lastname varchar(64))");
// client.query("INSERT INTO emps(firstname, lastname) values($1, $2)", ['Ronald', 'McDonald']);
// client.query("INSERT INTO emps(firstname, lastname) values($1, $2)", ['Mayor', 'McCheese']);

// client.query("DROP TABLE emps");



var express = require('express');
var http = require('http');

var app = express();
var server = http.createServer(app);

app.get('/', function(req, res) {
    res.send("Hello World!");
});

server.listen(3000);
console.log('Express server started on port %s', server.address().port);
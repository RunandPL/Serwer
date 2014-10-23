var express = require('express');
var http = require('http');
var pg = require('pg');
var app = express();
var server = http.createServer(app);
var fs = require('fs');
var bodyParser = require('body-parser');
var expressJwt = require('express-jwt');
var jwt = require('jsonwebtoken');
var Q = require('Q');

var secret = 'EWGWEG32T24523GSD';
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use('/api', expressJwt({secret: secret}));

//var weatherService = require('./weatherService');

var User = require('./User');
var Route = require('./Route');

app.post('/login', function (req, res) {

    User.loginWithUsernameAndPassword( req.body.username, req.body.password ).then( function( user ) {
        
        var profile = {
            username: user.get('username')
        };

        // We are sending the profile inside the token
        var token = jwt.sign(profile, secret, { expiresInMinutes: 60*5 });
        res.json({ token: token });
        
    }, function() {
        res.status(401).send('Wrong user or password');
    });
});

app.get('/api/restricted', function(req, res) {
    console.log('user ' + req.user.username + ' is calling /api/restricted');
    res.json({
        name: 'Top protected restricted resource called by ' + req.user.username
    });
});

//app.get('/weather/:x/:y', function(req, res) {
//    res.send( weatherService.getWeather( req.param('x'), req.param('y') ) );
//});

app.post('/api/route', function(req, res) {
   Route.saveRoute( req.user.username, req.body.route ).then( function( rs ) {
       res.send( rs );
   }); 
});

app.get('/routes', function(req, res) {
    Route.getRoutes().then( function( routes ) {
        res.send( routes );
    })
    .catch( function( err ) {
        res.send( err );
    });
}); 

app.get('/', function(req, res) {
    
    var client = new pg.Client({
            user: "bttjzotgxwisqf",
            password: "6vvG9vGhNRns3RBH7XcoJhqYMc",
            database: "daj5aah1m705ur",
            port: 5432,
            host: "ec2-184-72-231-67.compute-1.amazonaws.com",
            ssl: true
    }); 
    client.connect();
  
    res.writeHead(200, {'Content-Type': 'text/html'});
  
    var resContent = "<!DOCTYPE html><html><body><h1>Data base content</h1><table style=\"width:300px\">";
  
    var query = client.query("SELECT username, password FROM users ORDER BY username, password");
    query.on("row", function (row, result) {
        result.addRow(row);
    });
    query.on("end", function (result) {
        for( var i=0; i < result.rows.length; i++ ) {
            resContent += "<tr><td>" + result.rows[i].username + "</td><td>" + result.rows[i].password + "</td></tr>";
        }
      
        resContent += "</table></body></html>";
        res.end(resContent);
        client.end();
    });
});

var fillDatabase = function() {
    return Q.all( [User.fillDatabaseWithData(), Route.fillDatabaseWithData()]);
};

fillDatabase().then( function() {
    server.listen(3000);
    console.log('Express server started on port %s', server.address().port);
});

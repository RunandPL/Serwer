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
var CONFIG = require('./config/Configuration');

var secret = 'EWGWEG32T24523GSD';
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use('/api', expressJwt({secret: secret}));

//var weatherService = require('./weatherService');

var User = require('./User');
var Route = require('./Route');
var Workout = require('./Workout');


app.post('/login', function (req, res) {
    console.log( 'POST /login' );
    
    if( !req.body.username || !req.body.password )
        res.status(400).send('Username and password are both required');
    
    User.loginWithUsernameAndPassword( req.body.username, req.body.password ).then( function( user ) {
        
        var profile = {
            username: user.get('username')
        };
        
        var token = jwt.sign(profile, secret, { expiresInMinutes: 60 * 5 });
        res.json({ token: token });
        
    }, function() {
        res.status(401).send('Wrong user or password');
    });
});

app.post('/login/google', function (req, res) {
    console.log( 'POST /login/google' );
    
    if( !req.body.username )
        res.status(400).send('Field: \'username\' is required');
    
    User.loginWithGmail( req.body.username ).then( function( response ) {
        var profile = {
            username: req.body.username
        };
        var token = jwt.sign(profile, secret, { expiresInMinutes: 60 * 5 });
        res.json({ token: token });
    });
});

app.get('/api/restricted', function(req, res) {
    console.log('GET /api/restricted');
    res.json({
        name: 'Top protected restricted resource called by ' + req.user.username
    });
});

//app.get('/weather/:x/:y', function(req, res) {
//    res.send( weatherService.getWeather( req.param('x'), req.param('y') ) );
//});s

app.post('/api/workout', function(req, res) {
    console.log('POST /api/workout by ' + req.user.username);
    
    Workout.addWorkout( req.user.username, req.body.route, req.body.lengthTime, req.body.burnedCalories, req.body.speedRate ).then( function( rs ) {
        res.send( rs );
    },
    function( err ) {
        res.status(400).send(err);
    }); 
});

app.get('/api/workout', function(req, res) {
    console.log('GET /api/workout by ' + req.user.username);
    
    Workout.getAllWorkoutsOfUser( req.user.username ).then( function( rs ) {
        res.send( rs );
    },
    function( err ) {
        res.status(400).send(err);
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

//var fillDatabase = function() {
//    return Q.all( [User.fillDatabaseWithData(), Workout.fillDatabaseWithData()]);
//};

var fillAllDb = function() {
    var d = Q.defer();
    
    Workout.dropTable().then( function() {
        User.fillDatabaseWithData().then( function() {
            Route.fillDatabaseWithData().then( function() {
                Workout.fillDatabaseWithData().then( function() {
                    d.resolve();
                });
            });
        });
    });
    
    return d.promise;
};

//fillAllDb().then( function() {
    server.listen(3000);
    console.log('Express server started on port %s', server.address().port);
//});

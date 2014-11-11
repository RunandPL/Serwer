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
var validator = require('validator');
var cors = require('cors');

var secret = 'EWGWEG32T24523GSD';
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use('/api', expressJwt({secret: secret}));

app.use(cors());

//var weatherService = require('./weatherService');

var User = require('./User');
var Route = require('./Route');
var Workout = require('./Workout');
var TrainerRunnerRequest = require('./TrainerRunnerRequest');

app.post('/register', function (req, res) {
    console.log( 'POST /register' );
    
    if( !('username' in req.body) || !('password' in req.body) || !('isTrainer' in req.body) || !req.body.username || !req.body.password ) {
        res.status(400).send('Username, password and isTrainer fields are required');
        return;
    }
    
    if( !validator.isEmail(req.body.username) ) {
        res.status(400).send('Field: \'username\' must be email');
        return;
    }
    
    var isTrainer = validator.toBoolean(req.body.isTrainer);
    
    User.registerUser( req.body.username, req.body.password, isTrainer ).then( function( response ) {
        res.send( response.msg );
    },
    function( err ) {
        if( err.code === '23505' )
            res.status(401).send("User already exist");
        else
            res.status(401).send(err);
    });
});

app.post('/login', function (req, res) {
    console.log( 'POST /login' );
    
    if( !('username' in req.body) || !('password' in req.body) || !req.body.username || !req.body.password ) {
        res.status(400).send('Username and password are both required');
        return;
    }
    
    if( !validator.isEmail(req.body.username) ) {
        res.status(400).send('Field: \'username\' must be email');
        return;
    }
    
    User.loginWithUsernameAndPassword( req.body.username, req.body.password ).then( function( user ) {
        var profile = {
            username: user.get('username'),
            isTrainer: user.get('isTrainer')
        };
        
        var token = jwt.sign(profile, secret, { expiresInMinutes: 60 * 5 });
        res.json({ token: token });
    }, function() {
        res.status(401).send('Wrong user or password');
    });
});

app.post('/login/google', function (req, res) {
    console.log( 'POST /login/google by ' + req.body.username );
    
    if( !('username' in req.body) || !('isTrainer' in req.body) || !req.body.username ) {
        res.status(400).send('Field: \'username\' and \'isTrainer\' is required');
        return;
    }
    
    if( !validator.isEmail(req.body.username) ) {
        res.status(400).send('Field: \'username\' must be email');
        return;
    }
    
    var isTrainer = validator.toBoolean(req.body.isTrainer);
    
    User.loginWithGmail( req.body.username, isTrainer ).then( function( response ) {
        var profile = {
            username: response.user.get('username'),
            isTrainer: response.user.get('isTrainer')
        };
        var token = jwt.sign(profile, secret, { expiresInMinutes: 60 * 5 });
        res.json({ token: token });
    },
    function( response ) {
        res.status(401).send( response );
    });
});

app.post('/api/password/change', function(req, res) {
    console.log( 'POST /api/password/change by ' + req.user.username );
    
    if( !('password' in req.body) || !req.body.password ) {
        res.status(400).send('Field: \'password\' is required');
        return;
    }
    
    User.changePassword( req.user.username, req.body.password ).then( function( response ) {
        res.send( "Password changed successfully");
    },
    function( err ) {
        res.status(400).send( err );
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
//});

// GET liste zapytan o dodanie jako trener, jezeli trener wysyla to zapytanie, dostaje liste wyslanych przez siebie zapytan
app.get('/api/connect', function(req, res) {
    console.log('GET /api/connect by ' + req.user.username);
    
    TrainerRunnerRequest.getAllRequestsOfUser( req.user.username, req.user.isTrainer ).then( function( response ) {
        res.send( response );
    },
    function( err ) {
        res.status(400).send( err );
    });
});

app.post('/api/connect/runner', function(req, res) {
    console.log('POST /api/connect/runner by ' + req.user.username);
    
    if( !('runnerUserName' in req.body) || !req.body.runnerUserName ) {
        res.status(400).send('Field: \'runnerUserName\' is required');
        return;
    }
    
    if( !validator.isEmail(req.body.runnerUserName) ) {
        res.status(400).send('Field: \'runnerUserName\' must be email');
        return;
    }
    
    TrainerRunnerRequest.sendRequestFromTrainerToRunner( req.user.username, req.body.runnerUserName ).then( function( response ) {
        res.send( 'Request was sent succesfully!' );
    },
    function( err ) {
        res.status(400).send( err );
    });
});

app.post('/api/connect/reject', function(req, res) {
    console.log('POST /api/connect/reject by ' + req.user.username);
    
    if( !('requestID' in req.body) ) {
        res.status(400).send('Field: \'requestID\' is required');
        return;
    }
    
    var requestInt = validator.toInt( req.body.requestID );
    if( isNaN(requestInt) ) {
        res.status(400).send('Field: \'requestID\' must be an integer');
        return;
    }
    
    TrainerRunnerRequest.rejectRequest( req.user.username, req.user.isTrainer, requestInt ).then( function( response ) {
        res.send( 'Request with ID: ' + requestInt + ' was rejected' );
    },
    function( err ) {
        res.status(400).send( err );
    });
});

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
    console.log('GET /');
    
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

var fillAllDb = function() {
    var d = Q.defer();
    
    Workout.dropTable().then( function() {
        return TrainerRunnerRequest.dropTable();
    }).then( function() {
        return User.dropTable();
    }).then( function() {
        return User.fillDatabaseWithData();
    }).then( function() {
        return TrainerRunnerRequest.dropTable();
    }).then( function() {
        return TrainerRunnerRequest.fillDatabaseWithData();
    }).then( function() {
        return Route.fillDatabaseWithData();
    }).then( function() {
        return Workout.fillDatabaseWithData();
    }).then( function() {
        
        TrainerRunnerRequest.sendRequestFromTrainerToRunner( 'trainer1@email.com', 'user1@email.com' ).then( function( msg ) {
            TrainerRunnerRequest.sendRequestFromTrainerToRunner( 'trainer2@email.com', 'user1@email.com' ).then( function( msg ) {
                TrainerRunnerRequest.sendRequestFromTrainerToRunner( 'trainer1@email.com', 'user2@email.com' ).then( function( msg ) {
                    console.log( 'request created' );
                });
            },
            function( err ) {
                console.log( err );
            });
        });
        d.resolve();
    });
    
    return d.promise;
};

//fillAllDb().then( function() {
    server.listen(3000);
    console.log('Express server started on port %s', server.address().port);
//});

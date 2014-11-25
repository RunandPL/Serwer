var express = require('express');
var http = require('http');
var pg = require('pg');
var app = express();
var server = http.createServer(app);
var fs = require('fs');
var bodyParser = require('body-parser');
var expressJwt = require('express-jwt');
var jwt = require('jsonwebtoken');
var Q = require('q');
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
var LiveWorkout = require('./LiveWorkout');
var TrainerRunnerRequest = require('./TrainerRunnerRequest');

var parseRoute = function( route ) {
    var d = Q.defer();
    
    try {
        var obj = JSON.parse( route );
        
        for( var i=0; i < obj.length; i++ ) {
            if( !('x' in obj[i]) || !('y' in obj[i]) || !('z' in obj[i]) ) {
                d.reject( 'Route must include array of objects with x,y and z fields' );
            }

            if( !validator.isFloat(obj[i].x) || !validator.isFloat(obj[i].y) || !validator.isFloat(obj[i].z) ) {
                d.reject( 'Fields x,y,z must be numbers' );
            }
        }
        d.resolve('Route is fine');
    } catch( err ) {
        d.reject( 'Error parsing route' );
    }
    return d.promise;
};

app.post('/register', function (req, res) {
    console.log( 'POST /register' );
    
    if( !('username' in req.body) || !('password' in req.body) || !('isTrainer' in req.body) || !req.body.username || !req.body.password ) {
        res.status(400).json({msg: 'Username, password and isTrainer fields are required'});
        return;
    }
    
    if( !validator.isEmail(req.body.username) ) {
        res.status(400).json({msg: 'Field: \'username\' must be email'});
        return;
    }
    
    var isTrainer = validator.toBoolean(req.body.isTrainer);
    
    User.registerUser( req.body.username, req.body.password, isTrainer ).then( function( response ) {
        res.json({msg: response.msg});
    },
    function( err ) {
        if( err.code === '23505' )
            res.status(401).json({msg: "User already exist"});
        else
            res.status(401).json({msg: err});
    });
});

app.post('/login', function (req, res) {
    console.log( 'POST /login' );
    
    if( !('username' in req.body) || !('password' in req.body) || !req.body.username || !req.body.password ) {
        res.status(400).json({msg:'Username and password are both required'});
        return;
    }
    
    if( !validator.isEmail(req.body.username) ) {
        res.status(400).json({msg:'Field: \'username\' must be email'});
        return;
    }
    
    User.loginWithUsernameAndPassword( req.body.username, req.body.password ).then( function( user ) {
        var profile = {
            id: user.get('id'),
            username: user.get('username'),
            isTrainer: user.get('isTrainer')
        };
        
        var token = jwt.sign(profile, secret, { expiresInMinutes: 60 * 5 });
        res.json({ token: token });
    }, function() {
        res.status(401).json({msg:'Wrong user or password'});
    });
});

app.post('/login/google', function (req, res) {
    console.log( 'POST /login/google by ' + req.body.username );
    
    if( !('username' in req.body) || !('isTrainer' in req.body) || !req.body.username ) {
        res.status(400).json({msg:'Field: \'username\' and \'isTrainer\' is required'});
        return;
    }
    
    if( !validator.isEmail(req.body.username) ) {
        res.status(400).json({msg:'Field: \'username\' must be email'});
        return;
    }
    
    var isTrainer = validator.toBoolean(req.body.isTrainer);
    
    User.loginWithGmail( req.body.username, isTrainer ).then( function( response ) {
        var profile = {
            id: response.user.get('id'),
            username: response.user.get('username'),
            isTrainer: response.user.get('isTrainer')
        };
        var token = jwt.sign(profile, secret, { expiresInMinutes: 60 * 5 });
        res.json({ token: token });
    },
    function( response ) {
        res.status(401).json({msg: response });
    });
});

// get wszystkich tras publicznych
app.get('/route', function(req, res) {
    console.log('GET /route');
    
    Route.getPublicRoutes().then( function( response ) {
        res.json({msg: response});
    },
    function( err ) {
        res.send( 400 ).json({msg: err})
    });
});

app.post('/api/password/change', function(req, res) {
    console.log( 'POST /api/password/change by ' + req.user.username );
    
    if( !('password' in req.body) || !req.body.password ) {
        res.status(400).json({msg:'Field: \'password\' is required'});
        return;
    }
    
    User.changePassword( req.user.username, req.body.password ).then( function( response ) {
        res.json({msg: "Password changed successfully"});
    },
    function( err ) {
        res.status(400).json({ msg: err });
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

app.post('/api/route', function(req, res) {
    console.log('GET /api/route by ' + req.user.username);
   
    if( !('route' in req.body) ) {
        res.status(400).json({ msg:'Field: \'route\' is required'});
        return;
    }
    
    parseRoute(req.body.route).then( function( response ) {
        var isPublicVar;
        if( !('isPublic' in req.body) ) {
            isPublicVar = true;
        } else {
            isPublicVar = validator.toBoolean(req.body.route.isPublic);
        }

        Route.saveRoute( req.body.route, req.body.description, req.body.title, isPublicVar, req.user.isTrainer, req.body.length, req.user.id ).then( function( response ) {
            res.json({msg: response});
        },
        function( err ) {
            res.status(400).json({msg: err});
        });
    },
    function( err ) {
        res.status(400).json({msg: err});
    });
});

app.get('/api/route', function(req, res) {
    console.log('GET /api/route by ' + req.user.username);
    
    Route.getRouteOf( req.user.username ).then(function( response ) {
        res.json({msg: response});
    },
    function( err ) {
        res.status(400).json({msg: err});
    });
});

// pobieranie listy tras stworzonych przez wlasnego trenera biegacza
app.get('/api/route/trainer', function(req, res) {
    console.log('GET /api/route/trainer by ' + req.user.username);
    
    Route.getAllRoutesOfTrainerOf( req.user.id ).then(function( response ) {
        res.json({msg: response});
    },
    function( err ) {
        res.status(400).json({msg: err});
    });
});

// GET liste zapytan o dodanie jako trener, jezeli trener wysyla to zapytanie, dostaje liste wyslanych przez siebie zapytan
app.get('/api/connect', function(req, res) {
    console.log('GET /api/connect by ' + req.user.username);
    
    TrainerRunnerRequest.getAllRequestsOfUser( req.user.username, req.user.isTrainer ).then( function( response ) {
        res.json({msg: response});
    },
    function( err ) {
        res.status(400).json({msg: err });
    });
});

app.post('/api/connect/runner', function(req, res) {
    console.log('POST /api/connect/runner by ' + req.user.username);
    
    if( !('runnerUserName' in req.body) || !req.body.runnerUserName ) {
        res.status(400).json({msg: 'Field: \'runnerUserName\' is required'});
        return;
    }
    
    var email = validator.toString(req.body.runnerUserName); 
    
    if( !validator.isEmail(email) ) {
        res.status(400).json({msg:'Field: \'runnerUserName\' must be email'});
        return;
    }
    
    TrainerRunnerRequest.sendRequestFromTrainerToRunner( req.user.username, email ).then( function( response ) {
        res.json({msg: 'Request was sent succesfully!'});
    },
    function( err ) {
        res.status(400).json({msg: err });
    });
});

app.post('/api/connect/reject', function(req, res) {
    console.log('POST /api/connect/reject by ' + req.user.username);
    
    if( !('requestID' in req.body) ) {
        res.status(400).json({msg:'Field: \'requestID\' is required'});
        return;
    }
    
    var requestInt = validator.toInt( req.body.requestID );
    if( isNaN(requestInt) ) {
        res.status(400).json({msg:'Field: \'requestID\' must be an integer'});
        return;
    }
    
    TrainerRunnerRequest.rejectRequest( req.user.username, req.user.isTrainer, requestInt ).then( function( response ) {
        res.send( 'Request with ID: ' + requestInt + ' was rejected' );
    },
    function( err ) {
        res.status(400).json({err: err });
    });
});

app.post('/api/connect/accept', function(req, res) {
    console.log('POST /api/connect/accept by ' + req.user.username);
   
    if( !('requestID' in req.body) ) {
        res.status(400).json({msg:'Field: \'requestID\' is required'});
        return;
    }
    
    var requestInt = validator.toInt( req.body.requestID );
    if( isNaN(requestInt) ) {
        res.status(400).json({msg:'Field: \'requestID\' must be an integer'});
        return;
    }
    
    TrainerRunnerRequest.acceptRequest( req.user.username, req.user.isTrainer, requestInt ).then( function( response ) {
        res.json({msg: 'Request with ID: ' + requestInt + ' was accepted' });
    },
    function( err ) {
        res.status(400).json({msg: err});
    });
});

app.get('/api/runners/list', function(req, res) {
    console.log("GET /api/runners/list by " + req.user.username);
    
    User.getRunnersOfTrainer( req.user.username ).then( function( response ) {
        res.json({msg: response});
    },
    function( err ) {
        res.status(400).json({msg: err});
    });
});


app.post('/api/workout', function(req, res) {
    console.log('POST /api/workout by ' + req.user.username);
    
    if( req.user.isTrainer ) {
        res.status(400).json({msg: "User is a trainer"});
        return;
    }
    
    if( !('route' in req.body) ) {
        res.status(400).json({ msg:'Field: \'route\' is required'});
        return;
    }
    
    if( typeof req.body.route !== 'object' ) {
        res.status(400).json({ msg:'Field: \'route\' must be an object'});
        return;
    }
    
    if( !('route' in req.body.route) ) {
        res.status(400).json({ msg: 'Field: \'route.route\' is required' });
        return;
    }
    
    parseRoute(req.body.route.route).then( function( response ) {
        var isPublicVar;
        if( !('isPublic' in req.body.route) ) {
            isPublicVar = true;
        } else {
            isPublicVar = validator.toBoolean(req.body.route.isPublic);
        }

        if( 'length' in req.body.route ) {
            isPublicVar = true;
            var routeLength = validator.toFloat(req.body.route.length);
            if( isNaN( routeLength ) ) {
                res.status(400).json({ msg: 'Field: \'route.length\' must be a float' });
                return;
            }
        }

        if( !('lengthTime' in req.body) ) {
            res.status(400).json({ msg:'Field: \'lengthTime\' is required'});
            return;
        }

        if( !('burnedCalories' in req.body) ) {
            res.status(400).json({ msg:'Field: \'burnedCalories\' is required'});
            return;
        }

        if( !('speedRate' in req.body) ) {
            res.status(400).json({ msg:'Field: \'speedRate\' is required'});
            return;
        }

        Workout.addWorkout( req.user.username, {
            route: req.body.route.route,
            description: req.body.route.description,
            title: req.body.route.title,
            isPublic: isPublicVar,
            length: req.body.route.length
        }, req.body.lengthTime, req.body.burnedCalories, req.body.speedRate ).then( function( rs ) {
            res.json({msg: rs});
        },
        function( err ) {
            res.status(400).json({msg: err});
        }); 
    },
    function( err ) {
        res.status(400).json({msg: err});
    });
});

app.post('/api/live/start', function(req, res) {
    console.log('POST /api/live/start by ' + req.user.username);
    
    if( !('x' in req.body) || !('y' in req.body) || !('z' in req.body) ) {
        res.status(400).json({ msg:'Fields: \'x y z\' are required'});
        return;
    }
    
    LiveWorkout.startLiveWorkout( req.user.username, req.user.isTrainer, req.body.x, req.body.y, req.body.z ).then( function( response ) {
        res.json({msg: response});
    },
    function( err ) {
        res.status(400).json({msg: err});
    });
});

app.get('/api/live', function(req, res) {
    console.log('GET /api/live by ' + req.user.username);
    
    LiveWorkout.getLiveTrainingsOfTrainerRunners( req.user.username ).then( function( response ) {
        res.json({msg: response});
    },
    function( err ) {
        res.status(400).json({msg: err});
    });
});

app.get('/api/workout', function(req, res) {
    console.log('GET /api/workout by ' + req.user.username);
    
    Workout.getAllWorkoutsOfUser( req.user.username ).then( function( rs ) {
        res.json({msg: rs });
    },
    function( err ) {
        res.status(400).json({msg:err});
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

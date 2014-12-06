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
var path = require('path');

var secret = 'EWGWEG32T24523GSD';
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use('/api', expressJwt({secret: secret}));
app.use("/public", express.static(__dirname + '/../public'));
 
app.use(cors());

var weatherService = require('./weatherService');

var User = require('./User');
var Route = require('./Route');
var Workout = require('./Workout');
var LiveWorkout = require('./LiveWorkout');
var TrainerRunnerRequest = require('./TrainerRunnerRequest');
var Image = require('./Image');

var parseRoute = function( route ) {
    var d = Q.defer();
    
    try {
        var obj = JSON.parse( route );
        
        for( var i=0; i < obj.length; i++ ) {
            if( !('x' in obj[i]) || !('y' in obj[i]) || !('z' in obj[i]) ) {
                d.reject('Route must include array of objects with x,y and z fields');
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
        
        var token = jwt.sign(profile, secret, { expiresInMinutes: CONFIG.tokenExpirationTime() });
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

app.get('/weather/:x/:y', function(req, res) {
    res.send( weatherService.getWeather( req.param('x'), req.param('y') ) );
});

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
        res.send({ msg: 'Request with ID: ' + requestInt + ' was rejected' });
    },
    function( err ) {
        res.status(400).json({msg: err });
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

app.get('/api/trainer', function(req, res) {
    console.log("GET /api/trainer by " + req.user.username);
    
    User.getTrainerOfUser( req.user.username ).then( function( response ) {
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
    
    var isImagesField = false;
    if( ('images' in req.body) ) {
        if( req.body.images.constructor !== Array ) {
            res.status(400).json({ msg: 'Field: \'images\' must be an array' });
            return;
        }

        for( var i=0; i < req.body.images.length; i++ ) {
            if( typeof req.body.images[i] !== 'object' ) {
                res.status(400).json({ msg:'All: \'images\' fields must be an objects'});
                return;
            }
            if( !('x' in req.body.images[i]) || !('y' in req.body.images[i]) || !('z' in req.body.images[i]) ) {
                res.status(400).json({ msg: 'Field: \'x\',\'y\' and \'z\' in images are required' });
                return;
            }
            if( !('data' in req.body.images[i]) ) {
                res.status(400).json({ msg: 'Field: \'data\' in images is required' });
                return;
            }
            isImagesField = true;
        }
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
            
            var dArray = [];
            if( isImagesField ) {
                for( var i=0; i < req.body.images.length; i++ ) {
                    var x = validator.toFloat(req.body.images[i].x);
                    var y = validator.toFloat(req.body.images[i].y);
                    var z = validator.toFloat(req.body.images[i].z);

                    dArray.push( Image.addImage( req.body.images[i].data, x, y, z, rs.routeId ) );
                }
            
                Q.all( dArray ).then( function() {
                    res.json({msg: rs.msg});
                });
            } else {
                res.json({msg: rs.msg});
            }
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
    
    var x = validator.toFloat( req.body.x );
    var y = validator.toFloat( req.body.y );
    var z = validator.toFloat( req.body.z );
    
    if( isNaN(x) || isNaN(y) || isNaN(z) ) {
        res.status(400).json({ msg:'Fields: \'x y z\' must be floats'});
        return;
    }
    
    LiveWorkout.startLiveWorkout( req.user.username, req.user.isTrainer, x, y, z ).then( function( response ) {
        res.json({msg: response});
    },
    function( err ) {
        res.status(400).json({msg: err});
    });
});

app.post('/api/live/stop', function(req, res) {
    console.log('POST /api/live/stop by ' + req.user.username);
    
    LiveWorkout.stopLiveWorkout( req.user.username ).then( function( response ) {
        res.json({msg: response});
    },
    function( err ) {
        res.status(400).json({msg: err});
    });
});


app.post('/api/live/update', function(req, res) {
    console.log('POST /api/live/start by ' + req.user.username);
    
    if( !('x' in req.body) || !('y' in req.body) || !('z' in req.body) || !('runTime' in req.body) || !('calories' in req.body) || !('tempo' in req.body) || !('distance' in req.body) ) {
        res.status(400).json({ msg:'Fields: \'x y z runTime calories tempo distance\' are required'});
        return;
    }
    
    var x = validator.toFloat( req.body.x );
    var y = validator.toFloat( req.body.y );
    var z = validator.toFloat( req.body.z );
    
    //czasBiegu, iloscKalorii, tempo, dystans
    var czasBiegu = validator.toFloat( req.body.runTime );
    var iloscKalorii = validator.toFloat( req.body.calories );
    var tempo = validator.toFloat( req.body.tempo );
    var dystans = validator.toFloat( req.body.distance );
    
    if( isNaN(x) || isNaN(y) || isNaN(z) || isNaN(czasBiegu) || isNaN(iloscKalorii) || isNaN(tempo) || isNaN(dystans) ) {
        res.status(400).json({ msg:'Fields: \'x y z runTime calories tempo distance\' must be floats'});
        return;
    }
    
    LiveWorkout.updateLiveWorkout( req.user.username, x, y, z, czasBiegu, iloscKalorii, tempo, dystans ).then( function( response ) {
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

app.post('/api/live/message', function(req, res) {
    console.log('GET /api/live by ' + req.user.username);
    
    if( !('message' in req.body) || !req.body.message ) {
        res.status(400).json({ msg:'Field: \'message\' is required'});
        return;
    }
    
    if( !('username' in req.body) || !req.body.username ) {
        res.status(400).json({ msg:'Field: \'username\' is required'});
        return;
    }
    
    LiveWorkout.sendMessageToOwnRunner( req.user.username, req.user.isTrainer, req.body.username, req.body.message ).then( function( response ) {
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

app.get('/api/password', function(req, res) {
    console.log('GET /api/password by ' + req.user.username);
    
    User.doUserGotPassword( req.user.username ).then( function( response ) {
        res.json({msg: "Password found"});
    },
    function( err ) {
        res.status(404).json({msg: "Password not found"});
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
        return Image.dropTable();
    }).then( function() {
        return Image.fillDatabaseWithData();
    }).then( function() {
        return Workout.fillDatabaseWithData();
    }).then( function() {
        
        Route.saveRoute(JSON.stringify([
            {
                "x": 54.4086326250163,
                "y": 18.610104663848915,
                "z": 1.0
            },
            {
                "x": 54.409041648954904,
                "y": 18.610635930017907,
                "z": 1.0
            },
            {
                "x": 54.40910254514612,
                "y": 18.61085328609056,
                "z": 1.0
            },
            {
                "x": 54.40918841749733,
                "y": 18.611016998664923,
                "z": 1.0
            },
            {
                "x": 54.40935391760528,
                "y": 18.61122641209454,
                "z": 1.0
            },
            {
                "x": 54.40950223008439,
                "y": 18.611545696961457,
                "z": 1.0
            },
            {
                "x": 54.40966302954622,
                "y": 18.611988366671767,
                "z": 1.0
            },
            {
                "x": 54.41017350972818,
                "y": 18.612376118914653,
                "z": 1.0
            },
            {
                "x": 54.41068398880181,
                "y": 18.612720964933942,
                "z": 1.0
            },
            {
                "x": 54.411334935323275,
                "y": 18.61045342101295,
                "z": 1.0
            },
            {
                "x": 54.41150430146093,
                "y": 18.609759506463433,
                "z": 1.0
            },
            {
                "x": 54.411973360560744,
                "y": 18.608679340004073,
                "z": 1.0
            },
            {
                "x": 54.41259458000862,
                "y": 18.60760120239047,
                "z": 1.0
            },
            {
                "x": 54.41275376765117,
                "y": 18.60708094904021,
                "z": 1.0
            },
            {
                "x": 54.41684614161236,
                "y": 18.61196853634351,
                "z": 1.0
            },
            {
                "x": 54.41762962976175,
                "y": 18.61258637428284,
                "z": 1.0
            }
        ]), "Przykładowy opis trasy", "Tytuł trasy", true, true, 500, 1 ).then( function( response ) {
            console.log('Route uploaded to the server');
        })
        
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

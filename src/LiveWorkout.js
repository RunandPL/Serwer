
var Q = require('q');
var User = require('./User');

var liveTrainings = [];

exports.startLiveWorkout = function( username, isTrainer, x, y, z  ) {
    var d = Q.defer();
    
    if( isTrainer ) {
        d.reject( 'User must be an runner' );
    }
    
    for( var i=0; i < liveTrainings.length; i++ ) {
        if( liveTrainings[i].username === username ) {
            d.reject( "User: " + username + " already started an workout" );
            break;
        }
    }
    
    var route = JSON.stringify([
        {
            x: x,
            y: y,
            z: z
        }
    ]);
    
    liveTrainings.push({
        username : username,
        route: route,
        messages: [],
        startTime: new Date()
    });
    d.resolve( "Workout succesfully started" );
    
    return d.promise;
};

exports.getLiveWorkoutOf = function( username ) {
    var d = Q.defer();
    
    var good = false;
    for( var i=0; i < liveTrainings.length; i++ ) {
        if( liveTrainings[i].username === username ) {
            d.resolve( liveTrainings[i] );
            good = true;
            break;
        }
    }
    
    if( !good ) {
        d.reject( 'Not found live training for user: ' + username );
    }
    
    return d.promise;
};

exports.updateLiveWorkout = function( username, x, y, z ) {
    var d = Q.defer();
    
    var good = false;
    for( var i=0; i < liveTrainings.length; i++ ) {
        if( liveTrainings[i].username === username ) {
            var training = liveTrainings[i];
            var route = JSON.parse( training.route );
            route.push( x, y, z );
            liveTrainings[i].route = JSON.stringify( route );
            
            d.resolve( liveTrainings[i] );
            good = true;
            break;
        }
    }
    
    if( !good ) {
        d.reject( 'Not found live training for user: ' + username );
    }
    
    return d.promise;
};

exports.getUsersThatAreTraining = function() {
    var d = Q.defer();
    
    var users = [];
    for( var i=0; i < liveTrainings.length; i++ ) {
        users.push( liveTrainings[i].username );
    }
    d.resolve( users );
    
    return d.promise;
};

exports.getLiveTrainingsOfTrainerRunners = function( trainerUsername ) {
    var d = Q.defer();
    var obj = [];
    
    User.getRunnersOfTrainer( trainerUsername ).then( function( response ) {
        for( var i=0; i < response.length; i++ ) {
            for( var j=0; j < liveTrainings.length; j++ ) {
                if( liveTrainings[j].username === response[i].username ) {
                    obj.push( liveTrainings[j] );
                    break;
                }
            }
        }
        d.resolve( obj );
    },
    function( err ) {
        d.reject( err );
    });
    
    return d.promise;
};

var Q = require('q');
var User = require('./User');

var liveTrainings = [];

exports.startLiveWorkout = function( username, isTrainer, x, y, z  ) {
    var d = Q.defer();
    
    if( isTrainer ) {
        d.reject( 'User must be an runner' );
    }
    
    var route = JSON.stringify([
        {
            x: x,
            y: y,
            z: z
        }
    ]);
    
    var obj = {
        username : username,
        route: route,
        messages: [],
        startTime: new Date()
    };
    
    var exist = false;
    for( var i=0; i < liveTrainings.length; i++ ) {
        if( liveTrainings[i].username === username ) {
            liveTrainings[i] = obj;
            exist = true;
            break;
        }
    }
    
    if( !exist ) {
        liveTrainings.push(obj);
    }
    
    d.resolve( "Workout succesfully started" );
    
    return d.promise;
};

exports.stopLiveWorkout = function( username ) {
    var d = Q.defer();
    
    var good = false;
    for( var i=0; i < liveTrainings.length; i++ ) {
        if( liveTrainings[i].username === username ) {
            good = true;
            liveTrainings.splice(i, 1);
            d.resolve( "Workout stopped" );
            break;
        }
    }
    
    if( !good ) {
        d.reject( "Current user is not training" );
    }
    
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

exports.updateLiveWorkout = function( username, x, y, z, czasBiegu, iloscKalorii, tempo, dystans ) {
    var d = Q.defer();
    
    var good = false;
    for( var i=0; i < liveTrainings.length; i++ ) {
        if( liveTrainings[i].username === username ) {
            var training = liveTrainings[i];
            var route = JSON.parse( training.route );
            route.push({
                x: x,
                y: y,
                z: z,
                czasBiegu: czasBiegu,
                iloscKalorii: iloscKalorii,
                tempo: tempo,
                dystans: dystans
            });
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

exports.sendMessageToOwnRunner = function( trainerUsername, isTrainer, runnerUsername, message ) {
    var d = Q.defer();

    if( !isTrainer ) {
        d.reject( "User: " + trainerUsername + " is not a trainer" );
    } else {
        User.getRunnersOfTrainer( trainerUsername ).then( function( response ) {
            var good = false;
            for( var i=0; i < response.length; i++ ) {
                for( var j=0; j < liveTrainings.length; j++ ) {
                    if( liveTrainings[j].username === response[i].username && liveTrainings[j].username === runnerUsername ) {
                        good = true;
                        liveTrainings[j].messages.push({
                            msg: message
                        });
                        d.resolve( "Message sent" );
                        break;
                    }
                }
            }
            if( !good ) {
                d.reject( "User you are trying to send message is not your, or isn't currently training" );
            }
        });
    }
    
    return d.promise;
};
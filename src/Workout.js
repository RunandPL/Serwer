
var dbConfig = require('./config/Configuration').dbConfig;
var knex = require('knex')(dbConfig);
var bookshelf = require('bookshelf')(knex);
var Q = require('Q');

var User = require('./User');
var Route = require('./Route');

var Workout, Workouts;

Workout = bookshelf.Model.extend({
    tableName: 'workouts'
},
{
    addWorkout: function( username, route, lengthTime, burnedCalories, speedRate ) {
        var d = Q.defer();
        
        if( !username || !route || !lengthTime || !burnedCalories || !speedRate )
            d.reject('All fields are required!');
        
        User.getIdOfUser( username ).then( function( userId ) {
            
            Route.saveRoute( route ).then( function( res ) {
                var routeId = res.id;

                this.forge({ lengthTime: lengthTime, burnedCalories: burnedCalories, speedRate: speedRate, user_id: userId, route_id: routeId }).save().then( function() {
                    d.resolve( 'Training was added' );
                },
                function( err ) {
                    d.reject( err );
                });
            }.bind( this ),
            function( res ) {
                d.reject('Error while saving route!');
            });
        }.bind( this ),
        function( res ) {
            d.reject( res );
        });
        
        return d.promise;
    },
    
    getAllWorkoutsOfUser: function( username ) {
        var d = Q.defer();
        
        User.getIdOfUser( username ).then( function( userId ) {
            new this().fetchAll({user_id: userId}).then(function( workouts ) {
                var jsonWorkouts = workouts.toJSON();
                
                // zamienienie id tras na ich rzeczywiste wartości z tabeli tras
                var totalProcessed = 0;
                for( var i=0; i < jsonWorkouts.length; i++ ) {
                    ( function( i ) {
                        Route.getRouteWithId( jsonWorkouts[i].route_id ).then( function( rs ) {
                            delete jsonWorkouts[i].route_id;
                            delete jsonWorkouts[i].user_id;
                            jsonWorkouts[i].route = rs.get('route');

                            totalProcessed++;
                            if( totalProcessed === jsonWorkouts.length ) {
                                d.resolve( jsonWorkouts );
                            }
                        },
                        function( err ) {
                            d.reject( err );
                        });
                    })( i );
                }
            },
            function( err ) {
                d.reject( err );
            });
        }.bind( this ) );
        
        return d.promise;
    }
});

exports.dropTable = function() {
    return bookshelf.knex.schema.dropTableIfExists('workouts');
};

exports.fillDatabaseWithData = function() {
    var d = Q.defer();
    
    bookshelf.knex.schema.createTable('workouts', function (table) {
        table.increments('id').unique();
        table.bigInteger('lengthTime').notNullable();
        table.integer('burnedCalories').notNullable();
        table.double('speedRate').notNullable();
        table.integer('user_id').unsigned().references('users.id');
        table.integer('route_id').unsigned().references('routes.id');
    }).then( function( ret ) {
        d.resolve( ret );
    });
    
    return d.promise;
};

exports.addWorkout = function( username, route, lengthTime, burnedCalories, speedRate ) {
    return Workout.addWorkout( username, route, lengthTime, burnedCalories, speedRate );
}

exports.getAllWorkoutsOfUser = function( username ) {
    return Workout.getAllWorkoutsOfUser( username );
}
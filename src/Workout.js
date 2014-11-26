
var dbConfig = require('./config/Configuration').dbConfig;
var knex = require('knex')(dbConfig);
var bookshelf = require('bookshelf')(knex);
var Q = require('q');

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
            Route.saveRoute( route.route, route.description, route.title, route.isPublic, false, route.length, userId ).then( function( res ) {
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
        
        bookshelf.knex('workouts')
        .select('workouts.id', 'workouts.lengthTime', 'workouts.burnedCalories', 'workouts.speedRate',
                'route.route as route_route', 'route.description as route_description', 'route.title as route_title', 'route.isPublic as route_isPublic', 'route.isCreatedByTrainer as route_isCreatedByTrainer', 'route.length as route_length' )
        .join('users as user', 'user.id', 'workouts.user_id')
        .join('routes as route', 'route.id', 'workouts.route_id')
        .where('user.username', username)
        .then( function( response ) {
            d.resolve( response );
        },
        function( err ) {
            d.reject( err );
        });
        
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
};

exports.getAllWorkoutsOfUser = function( username ) {
    return Workout.getAllWorkoutsOfUser( username );
};
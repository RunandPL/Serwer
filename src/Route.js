
var CONFIG = require('./config/Configuration');
var dbConfig = CONFIG.dbConfig;
//var knex = require('knex')(dbConfig);
//var bookshelf = require('bookshelf')(knex);
var Q = require('q');

var Route, Routes;

Route = CONFIG.bookshelf.Model.extend({
    tableName: 'routes'
},
{
    getAllRoutesOfTrainerOf : function( userID )
    {
        var d = Q.defer();
        
        CONFIG.bookshelf.knex('users')
        .where('users.id', userID)
        .join('routes', 'users.trainer_id', 'routes.owner_id')
        .select('routes.id', 'routes.route', 'routes.title', 'routes.description', 'routes.isPublic', 'routes.length')
        .then( function( response ) {
           d.resolve( response ); 
        },
        function( err ) {
            d.reject( err );
        });

        return d.promise;
    },
    
    getRouteOf : function( username ) {
        var d = Q.defer();

        CONFIG.bookshelf.knex('routes')
        .join('users', 'users.id', 'routes.owner_id' )
        .where('users.username', username)
        .select('routes.id', 'routes.route', 'routes.title', 'routes.description', 'routes.isPublic', 'routes.length')
        .then( function( response ) {
//            d.resolve( response );
            var dArray = [];
            for( var i=0; i < response.length; i++ ) {
                ( function( r, idx ) {
                    dArray.push( CONFIG.bookshelf.knex('images')
                    .where('images.route_id', r.id)
                    .select('images.url')
                    .then( function( resp ) {
                        response[idx].urls = resp;
                    }));
                })( response[i], i );
            }
            
            Q.all( dArray ).then( function() {
                d.resolve( response );
            });
        },
        function( err ) {
            d.reject( err );
        });

        return d.promise;
    },
    
    getPublicRoutes : function() {
        var d = Q.defer();

        CONFIG.bookshelf.knex('routes')
        .where('isPublic', 'true')
        .join('users', 'users.id', 'routes.owner_id' )
        .select('routes.id', 'routes.route', 'routes.title', 'routes.description', 'routes.isCreatedByTrainer', 'routes.length', 'users.username as owner')
        .then( function( response ) {
            var dArray = [];
            for( var i=0; i < response.length; i++ ) {
                ( function( r, idx ) {
                    dArray.push( CONFIG.bookshelf.knex('images')
                    .where('images.route_id', r.id)
                    .select('images.url')
                    .then( function( resp ) {
                        response[idx].urls = resp;
                    }));
                })( response[i], i );
            }
            
            Q.all( dArray ).then( function() {
                d.resolve( response );
            });
        },
        function( err ) {
            d.reject( err );
        });

        return d.promise;
    },
    
    getRoutes : function() {
        var d = Q.defer();

        new this().fetchAll().then(function(routes) {
            d.resolve( routes.toJSON() );
        }, function( err ) {
            d.reject( err );
        });
        return d.promise;
    },
    
    getRouteWithId: function( id ) {
        var d = Q.defer();
        
        new this({id: id}).fetch({require: true}).then( function(route) {
            d.resolve( route );
        }, function( err ) {
            d.reject( err );
        });
        return d.promise;
    },
    
    saveRoute : function( route, description, title, isPublic, isCreatedByTrainer, length, owner_id ) {
        var d = Q.defer();
        
        this.forge({ 
            route: route,
            description: description,
            title: title,
            isPublic: isPublic,
            isCreatedByTrainer: isCreatedByTrainer,
            length: length,
            owner_id : owner_id
        }).save().then( function( res ) {
            d.resolve( res );
        },
        function( res ) {
            d.reject( res );
        });
        return d.promise;
    }
});
        
exports.fillDatabaseWithData = function() {
    var d = Q.defer();
    
    CONFIG.bookshelf.knex.raw('DROP TABLE routes CASCADE').then( function( ret ) {
        
        return CONFIG.bookshelf.knex.schema.createTable('routes', function (table) {
            table.increments('id').unique();
            table.text('route');
            table.text('description');
            table.string('title');
            table.boolean('isPublic');
            table.boolean('isCreatedByTrainer');
            table.float('length');
            table.integer('owner_id').unsigned().references('users.id');
        });
    })
    .then(function( ret ) {
        d.resolve( ret );
    });
    
    return d.promise;
};

exports.getRoutes = function() {
    return Route.getRoutes();
};

exports.saveRoute = function( route, description, title, isPublic, isCreatedByTrainer, length, owner_id ) {
    return Route.saveRoute( route, description, title, isPublic, isCreatedByTrainer, length, owner_id );
};

exports.getRouteWithId = function( id ) {
    return Route.getRouteWithId( id );
};

exports.getPublicRoutes = function() {
    return Route.getPublicRoutes();
};

exports.getRouteOf = function( username ) {
    return Route.getRouteOf( username );
};

exports.getAllRoutesOfTrainerOf = function( userID ) {
    return Route.getAllRoutesOfTrainerOf( userID );  
};

var dbConfig = require('./config/Configuration').dbConfig;
var knex = require('knex')(dbConfig);
var bookshelf = require('bookshelf')(knex);
var Q = require('Q');

var Route, Routes;

exports.fillDatabaseWithData = function() {
    var d = Q.defer();
    
    bookshelf.knex.schema.dropTableIfExists('routes').then( function( ret ) {
        return bookshelf.knex.schema.createTable('routes', function (table) {
            table.increments('id').unique();
            table.string('owner');
            table.text('route'); // wspolrzedne trasy jako double poprzedzielane '?'
        });
    })
    .then( function() {
        
        Route = bookshelf.Model.extend({
            tableName: 'routes'
        },
        {
            getRoutes : function() {
                var d = Q.defer();
                
                new this().fetchAll().then(function(routes) {
                    d.resolve( routes.toJSON() );
                }, function( err ) {
                    d.reject( err );
                });
                return d.promise;
            },
            
            saveRoute : function( owner, route ) {
                var d = Q.defer();
                
                this.forge({
                    owner: owner,
                    route: route
                }).save().then( function( res ) {
                    d.resolve( res );
                }).catch( function( res ) {
                    d.reject( res );
                });
                return d.promise;
            }
        });

        Routes = bookshelf.Collection.extend({
            model: Route
        });

        return Routes.forge([
            {owner: 'user1@email.com', route: '23.42?424.35?124.35?4532.345'},
            {owner: 'user2@email.com', route: '34.35?245.35?245.25?352.235?253.235'}
        ]).invokeThen('save');
    }).then(function( ret ) {
        d.resolve( ret );
    });
    
    return d.promise;
};

exports.getRoutes = function() {
    return Route.getRoutes();
};

exports.saveRoute = function( owner, route ) {
    return Route.saveRoute( owner, route );
}
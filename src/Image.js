
var CONFIG = require('./config/Configuration');
var dbConfig = CONFIG.dbConfig;

var Q = require('q');

var User = require('./User');
var Route = require('./Route');

var Image;

Image = CONFIG.bookshelf.Model.extend({
    tableName: 'images'
},
{
    addImage : function( data, x, y, z, routeId ) {
        var d = Q.defer();
        
        var base64Data = data.replace(/^data:image\/jpeg;base64,/, "");
        
        var url = base64Data.substring(0,20) + '_' + String( Date.parse( new Date() ) ) + '_' + String(Math.floor(Math.random() * 10000));
        url = url.replace(/\//g, '');
        url = url.replace(/\s/g, '_');
        
        require("fs").writeFile( 'public/' + url + ".jpg", base64Data, 'base64', function(err) {
            if(err) {
                d.reject(err);
            } else {
                this.forge({url: 'public/' + url + ".jpg", latitude: x, longitude: y, atitude: z, route_id: routeId}).save().then( function(user) {
                    d.resolve( "Image uploaded" );
                });
            }
        }.bind( this ));
        
        return d.promise;
    }
});

exports.dropTable = function() {
    return CONFIG.bookshelf.knex.schema.dropTableIfExists('images');
};

exports.fillDatabaseWithData = function() {
    var d = Q.defer();
    
    CONFIG.bookshelf.knex.schema.createTable('images', function (table) {
        table.increments('id').unique();
        table.double('latitude').notNullable();
        table.double('longitude').notNullable();
        table.double('atitude').notNullable();
        table.string('url');
        table.integer('route_id').unsigned().references('routes.id');
    }).then( function( ret ) {
        d.resolve( ret );
    });
    
    return d.promise;
};

exports.addImage = function( data, x, y, z, routeId ) {
    return Image.addImage( data, x, y, z, routeId )
};
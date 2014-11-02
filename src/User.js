
var dbConfig = require('./config/Configuration').dbConfig;
var knex = require('knex')(dbConfig);
var bookshelf = require('bookshelf')(knex);
var Q = require('Q');

var Users, User;

User = bookshelf.Model.extend({
    tableName: 'users'
},
{
    loginWithUsernameAndPassword: function(username, password) {
        var d = Q.defer();

        if (!username || !password) return d.reject( 'Email and password are both required' );

        new this({username: username}).fetch({require: true}).then(function(user) {

            if( user.get('password') === password )
                d.resolve( user );
            else
                d.reject( "bad password" );
        }, function( err ) {
            d.reject( err );
        });

        return d.promise;
    },
    
    loginWithGmail: function(username) {
        var d = Q.defer();
        
        if (!username) return d.reject( 'Email is required' );
        
        new this({username: username}).fetch({require: true}).then(function(user) {
            d.resolve( 'Username found' );
        },
        function( err ) {
            this.forge({username: username}).save().then( function() {
                d.resolve( 'Username not found and new entry was created' );
            });
        }.bind( this ));
        
        return d.promise;
    },
    
    getIdOfUser : function( username ) {
        var d = Q.defer();
        
        new this({username: username}).fetch({require: true}).then(function(user) {
            d.resolve( user.get('id') );
        },
        function() {
            d.reject( 'Username not found' );
        });
        
        return d.promise;
    }
});
        
exports.fillDatabaseWithData = function() {
    var d = Q.defer();
    
    bookshelf.knex.schema.dropTableIfExists('users').then( function( ret ) {
        
        return bookshelf.knex.schema.createTable('users', function (table) {
            table.increments('id').unique();
            table.string('username').unique().notNullable();
            table.string('password').notNullable();
            table.boolean('isTrainer').notNullable();
        });
    }).then( function() {
        
        Users = bookshelf.Collection.extend({
            model: User
        });

        return Users.forge([
            {username: 'user1@email.com', password: 'test', isTrainer: 'false'},
            {username: 'user2@email.com', password: 'test', isTrainer: 'false'}
        ]).invokeThen('save');
    }).then(function( ret ) {
        d.resolve( ret );
    });
    
    return d.promise;
};

exports.loginWithUsernameAndPassword = function( username, password ) {
    return User.loginWithUsernameAndPassword( username, password );
};

exports.loginWithGmail = function( username ) {
    return User.loginWithGmail( username );
};

exports.getIdOfUser = function( username ) {
    return User.getIdOfUser( username );
};
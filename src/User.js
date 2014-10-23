
var dbConfig = require('./config/Configuration').dbConfig;
var knex = require('knex')(dbConfig);
var bookshelf = require('bookshelf')(knex);
var Q = require('Q');

var Users, User;

exports.fillDatabaseWithData = function() {
    var d = Q.defer();
    
    bookshelf.knex.schema.dropTableIfExists('users').then( function( ret ) {
        return bookshelf.knex.schema.createTable('users', function (table) {
            table.increments('id').unique();
            table.string('username').unique();
            table.string('password');
        });
    }).then( function() {
        User = bookshelf.Model.extend({
            tableName: 'users'
        },
        {
            loginWithUsernameAndPassword: function(username, password) {
                var d = Q.defer();

                if (!username || !password) throw new Error('Email and password are both required');

                new this({username: username.toLowerCase().trim()}).fetch({require: true}).then(function(user) {

                    if( user.get('password') === password ) {
                        d.resolve( user );
                    }
                    else
                        d.reject( "bad password" );
                }, function( err ) {
                    d.reject( err );
                });

                return d.promise;
            }
        });

        Users = bookshelf.Collection.extend({
            model: User
        });

        return Users.forge([
            {username: 'user1@email.com', password: 'test'},
            {username: 'user2@email.com', password: 'test'}
        ]).invokeThen('save');
    }).then(function( ret ) {
        d.resolve( ret );
    });
    
    return d.promise;
};

exports.loginWithUsernameAndPassword = function( username, password ) {
    return User.loginWithUsernameAndPassword( username, password );
};
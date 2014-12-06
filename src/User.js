
var CONFIG = require('./config/Configuration');
var dbConfig = CONFIG.dbConfig;
//var knex = require('knex')(dbConfig);
//var bookshelf = require('bookshelf')(knex);
var Q = require('q');

var Users, User;

User = CONFIG.bookshelf.Model.extend({
    tableName: 'users'
},
{
    getTrainerOfUser : function( username ) {
        var d = Q.defer();
        
        CONFIG.bookshelf.knex('users')
        .select( 'trainer.username as trainer')
        .join('users as trainer', 'users.trainer_id', 'trainer.id')
        .where('users.username', username)
        .then( function( resp ) {
            d.resolve( resp );
        },
        function( err ) {
            d.reject( err );
        });
        
        return d.promise;
    },
    
    doUserGotPassword: function( username ) {
        var d = Q.defer();
        
        this.getUser( username ).then( function( user ) {
            if( user.get('password') != null ) {
                d.resolve();
            } else {
                d.reject();
            }
        });
        
        return d.promise;
    },
    
    getRunnersOfTrainer: function( username ) {
        var d = Q.defer();
        
        this.getUser( username ).then( function( user ) {
            if( !user.get('isTrainer') ) {
                d.reject('User is not a trainer');
            }
            CONFIG.bookshelf.knex('users')
            .select('username')
            .where('trainer_id', user.get('id'))
            .then( function( response ) {
                d.resolve( response );
            },
            function( err ) {
                d.reject( err );
            });
        });
        
        return d.promise;
    },
    
    setTrainer: function( username, trainerUsername ) {
        var d = Q.defer();
        
        this.getUser( trainerUsername ).then( function( user ) {
            if( user.get('isTrainer') === true ) {
                CONFIG.bookshelf.knex('users')
                .where('username', username)
                .update({
                    trainer_id: user.get('id')
                }).then( function( ) {
                    d.resolve( 'Trainer: ' + trainerUsername + ' was set to user: ' + username );
                },
                function( err ) {
                    d.reject( err );
                });
            } else {
                d.reject( 'User with name: ' + trainerUsername + ' is not a trainer' );
            }
        },
        function( err ) {
            d.reject( 'User with name: ' + trainerUsername + ' wasn\'t found');
        });
        
        return d.promise;
    },
    
    changePassword: function( username, newPassword ) {
        var d = Q.defer();
        
        CONFIG.bookshelf.knex('users')
        .where('username', username)
        .update({
            password: newPassword
        })
        .then( function( response ) {
            d.resolve( response );
        },
        function( err ) {
            d.reject( err );
        });
        
        return d.promise;
    },
    
    registerUser: function( username, password, isTrainer ) {
        var d = Q.defer();
        
        this.forge({username: username, password: password, isTrainer: isTrainer}).save().then( function(user) {
            d.resolve({
                msg: 'User was created',
                user: user
            });
        },
        function( err ) {
            d.reject( err );
        });
        
        return d.promise;
    },
    
    loginWithUsernameAndPassword: function(username, password) {
        var d = Q.defer();

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
    
    loginWithGmail: function(username, isTrainer) {
        var d = Q.defer();
        
        new this({username: username}).fetch({require: true}).then(function(user) {
            if( user.get('isTrainer') !== isTrainer )
                d.reject( 'Cannot log in as trainer, because user is not a trainer' );
            else
                d.resolve({
                    msg: 'Username found',
                    user: user
                });
        },
        function( err ) {
            this.forge({username: username, isTrainer: isTrainer}).save().then( function(user) {
                d.resolve({
                    msg: 'Username not found and new entry was created',
                    user: user
                });
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
            d.reject( 'Username \''+ username +'\' not found' );
        });
        
        return d.promise;
    },
    
    getUser: function( username ) {
        var d = Q.defer();
        
        new this({username: username}).fetch({require: true}).then(function(user) {
            d.resolve( user );
        },
        function() {
            d.reject( 'Username \''+ username +'\' not found' );
        });
        
        return d.promise;
    },
    
    getUserWithId: function( id ) {
        var d = Q.defer();
        
        new this({id: id}).fetch({require: true}).then( function(user) {
            d.resolve( user );
        },
        function() {
            d.reject( 'Username with id: \''+ id +'\' not found' );
        });
        
        return d.promise;
    }
});
        
exports.fillDatabaseWithData = function() {
    var d = Q.defer();
    
    CONFIG.bookshelf.knex.schema.createTable('users', function (table) {
            table.increments('id').unique();
            table.string('username').unique().notNullable();
            table.string('password');
            table.boolean('isTrainer').notNullable();
            table.integer('trainer_id').unsigned().references('users.id');
    }).then( function() {
        Users = CONFIG.bookshelf.Collection.extend({
            model: User
        });

        return Users.forge([
            {username: 'trainer1@email.com', password: 'test', isTrainer: 'true'},
            {username: 'trainer2@email.com', password: 'test', isTrainer: 'true'},
            {username: 'trainer3@email.com', password: 'test', isTrainer: 'true'},
            {username: 'user1@email.com', password: 'test', isTrainer: 'false'},
            {username: 'user2@email.com', password: 'test', isTrainer: 'false'},
            {username: 'user3@email.com', password: 'test', isTrainer: 'false'},
            {username: 'user4@email.com', password: 'test', isTrainer: 'false'}
        ]).invokeThen('save');
    }).then(function( ret ) {
        d.resolve( ret );
    });
    
    return d.promise;
};

exports.dropTable = function() {
//    return bookshelf.knex.schema.dropTableIfExists('users');
    return CONFIG.bookshelf.knex.raw('DROP TABLE users CASCADE');
};

exports.loginWithUsernameAndPassword = function( username, password ) {
    return User.loginWithUsernameAndPassword( username, password );
};

exports.loginWithGmail = function( username, isTrainer ) {
    return User.loginWithGmail( username, isTrainer );
};

exports.getIdOfUser = function( username ) {
    return User.getIdOfUser( username );
};

exports.getUser = function( username ) {
    return User.getUser( username );
};

exports.getUserWithId = function( id ) {
    return User.getUserWithId( id );
};

exports.registerUser = function( username, password, isTrainer ) {
    return User.registerUser( username, password, isTrainer );
};

exports.changePassword = function( username, newPassword ) {
    return User.changePassword( username, newPassword );
};

exports.setTrainer = function( username, trainerUsername ) {
    return User.setTrainer( username, trainerUsername );
};

exports.getRunnersOfTrainer = function( username ) {
    return User.getRunnersOfTrainer( username );
};

exports.doUserGotPassword = function( username ) {
    return User.doUserGotPassword( username );
};

exports.getTrainerOfUser = function( username ) {
    return User.getTrainerOfUser( username );
};
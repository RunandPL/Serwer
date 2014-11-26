
var dbConfig = require('./config/Configuration').dbConfig;
var knex = require('knex')(dbConfig);
var bookshelf = require('bookshelf')(knex);
var Q = require('q');

var User = require('./User');

var TrainerRunnerRequest, TrainerRunnerRequests;

TrainerRunnerRequest = bookshelf.Model.extend({
    tableName: 'trainerRunnerRequests'
},
{
    acceptRequest: function( username, isTrainer, requestID ) {
        var d = Q.defer();
        
        if( isTrainer ) {
            d.reject( 'User: ' + username + ' is a trainer, and he cannot accept requests');
        }
        
        bookshelf.knex('trainerRunnerRequests')
        .select('trainerRunnerRequests.id as requestID', 'trainer.username as trainer')
        .join('users as runner', 'runner.id', 'trainerRunnerRequests.runner_id')
        .join('users as trainer', 'trainer.id', 'trainerRunnerRequests.trainer_id')
        .where('trainerRunnerRequests.id', requestID)
        .where('runner.username', username)
        .then( function( req ) {
            if( req.length === 0 ) {
                d.reject( 'User: ' + username + ' has no pending request with id: ' + requestID );
            } else {
                console.log( 'req', req );
                User.setTrainer( username, req[0].trainer ).then( function( res ) {
                    bookshelf.knex('trainerRunnerRequests')
                    .where('id', requestID)
                    .del()
                    .then( function( resp ) {
                        d.resolve( resp );
                    },
                    function( err ) {
                        d.reject( err );
                    });
                },
                function( err ) {
                    d.reject( err );
                });
            }
        },
        function( err ) {
            d.reject( err );
        });

        return d.promise;
    },
    
    rejectRequest: function( username, isTrainer, requestID ) {
        var d = Q.defer();
        
        var q = "";
        if( !isTrainer ) {
            q = 'runner.username';
        } else {
            q = 'trainer.username';
        }
        
        var query = bookshelf.knex('trainerRunnerRequests')
        .select('trainerRunnerRequests.id as requestID', 'runner.username as runner')
        .join('users as runner', 'runner.id', 'trainerRunnerRequests.runner_id')
        .join('users as trainer', 'trainer.id', 'trainerRunnerRequests.trainer_id')
        .where('trainerRunnerRequests.id', requestID)
        .where(q, username);

        query.then( function( req ) {
            if( req.length === 0 ) {
                d.reject( 'User: ' + username + ' has no pending request with id: ' + requestID );
            } else {
                bookshelf.knex('trainerRunnerRequests')
                .where('id', requestID)
                .del()
                .then( function( resp ) {
                    d.resolve( resp );
                },
                function( err ) {
                    d.reject( err );
                });
            }
        },
        function( err ) {
            d.reject( err );
        });
        
        return d.promise;
    },
    
    getAllRequestsOfUser: function( username, isTrainer ) {
        var d = Q.defer();
        
        if( isTrainer ) {
            bookshelf.knex('trainerRunnerRequests')
            .select('trainerRunnerRequests.id as requestID', 'runner.username as runner')
            .join('users as runner', 'runner.id', 'trainerRunnerRequests.runner_id')
            .join('users as trainer', 'trainer.id', 'trainerRunnerRequests.trainer_id')
            .where('trainer.username', username)
            .then( function( requests ) {
                d.resolve(requests);
            },
            function( err ) {
                d.reject( err );
            });
        } else {
            bookshelf.knex('trainerRunnerRequests')
            .select('trainerRunnerRequests.id as requestID', 'trainer.username')
            .join('users as runner', 'runner.id', 'trainerRunnerRequests.runner_id')
            .join('users as trainer', 'trainer.id', 'trainerRunnerRequests.trainer_id')
            .where('runner.username', username)
            .then( function( requests ) {
                d.resolve(requests);
            },
            function( err ) {
                d.reject( err );
            });
        }
        return d.promise;
    },
    
    sendRequestFromTrainerToRunner: function( trainerUserName, runnerUserName ) {
        var d = Q.defer();
        
        User.getUser( trainerUserName ).then( function( trainer ) {
            User.getUser( runnerUserName ).then( function( runner ) {
                // sprawdz czy taka relacja juz istnieje
                new this({trainer_id: trainer.get('id'), runner_id: runner.get('id')}).fetch({require: true}).then(function( request ) {
                    d.reject('Request from user ' + trainerUserName + ' to ' + runnerUserName + ' already exists!');
                }, function( err ) {
                    
                    if( !trainer.get('isTrainer') )
                        d.reject('User: ' + trainerUserName + ' is not a trainer');
                    else if( runner.get('isTrainer') )
                        d.reject('Target runner: ' + runnerUserName + ' is a trainer');
                    else {
                        // stworz zapytanie
                        this.forge({trainer_id: trainer.get('id'), runner_id: runner.get('id')}).save().then( function( request ) {
                            d.resolve({
                                msg: 'Request was created',
                                request: request
                            });
                        },
                        function( err ) {
                            d.reject( err );
                        });
                    }
                }.bind( this ));
            }.bind( this ),
            function( err ) {
                d.reject( err );
            });
        }.bind( this ),
        function( err ) {
            d.reject( err );
        });
        
        return d.promise;
    }
});

exports.dropTable = function() {
    return bookshelf.knex.schema.dropTableIfExists('trainerRunnerRequests');
};

exports.fillDatabaseWithData = function() {
    return bookshelf.knex.schema.createTable('trainerRunnerRequests', function (table) {
        table.increments('id').unique();
        table.integer('trainer_id').unsigned().references('users.id');
        table.integer('runner_id').unsigned().references('users.id');
    });
};

exports.sendRequestFromTrainerToRunner = function( trainerUserName, runnerUserName ) {
    return TrainerRunnerRequest.sendRequestFromTrainerToRunner( trainerUserName, runnerUserName );
};

exports.getAllRequestsOfUser = function( username, isTrainer ) {
    return TrainerRunnerRequest.getAllRequestsOfUser( username, isTrainer );
};

exports.rejectRequest = function( username, isTrainer, requestID ) {
    return TrainerRunnerRequest.rejectRequest( username, isTrainer, requestID );
};

exports.acceptRequest = function( username, isTrainer, requestID ) {
    return TrainerRunnerRequest.acceptRequest( username, isTrainer, requestID );
};
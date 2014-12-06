
exports.dbConfig = {
    client: 'postgresql',
    connection: {
      host     : 'ec2-184-72-231-67.compute-1.amazonaws.com',
      user     : 'bttjzotgxwisqf',
      password : '6vvG9vGhNRns3RBH7XcoJhqYMc',
      database : 'daj5aah1m705ur',
      ssl: true,
      port: 5432
    }
};

exports.forecastConfiguration = {
    service: 'forecast.io',
    key: '00cedfc6ff3daf7d397f990b4133e3d8',
    units: 'celcius', // Only the first letter is parsed
    cache: true,      // Cache API requests?
    ttl: {            // How long to cache requests. Uses syntax from moment.js: http://momentjs.com/docs/#/durations/creating/
        minutes: 27,
        seconds: 45
    }
};

exports.tokenExpirationTime = function() {
    return 60 * 999999999;
};

var knex = require('knex')(exports.dbConfig);
var bookshelf = require('bookshelf')(knex);

exports.knex = knex;
exports.bookshelf = bookshelf;

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
}
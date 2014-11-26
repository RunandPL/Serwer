var forecastConfig = require('./config/Configuration').forecastConfiguration;
var Forecast = require('forecast');
var Q = require('q');
var fs = require('fs');

// Initialize forecast
var forecast = new Forecast(forecastConfig);

var REFRESH_TIME = ( 4 * 60 * 60 );
        
var XX = 2, YY = 2; // na ile pol dzielimy siatke polski
// left most = 14.117
// right most = 24.133
// top most = 54.833
// down most = 49.000
var leftMost = 14.117;
var downMost = 49.000;
var dx = 24.133 - leftMost;
var dy = 54.833 - downMost;

var edgeCoordinates = [];
var weatherMap = [];

var d = Q.defer();
fs.stat('weather.json', function( err, stat ) {
    if( err ) {
        d.resolve( err );
    } else {
        var lastModTime = ( new Date() - stat.mtime ) / 1000;
        d.resolve( lastModTime );
    }
});

d.promise.then( function( lastModTime ) {
    console.log( 'File last modification time: ', lastModTime, 'seconds ago' ); 
    
    setTimeout( refreshWeatherInformation, ( REFRESH_TIME - lastModTime ) * 1000 < 0 ? 0 : ( REFRESH_TIME - lastModTime ) * 1000 );
    
    // Jezeli dane pogodowe sa aktualne, to tylko je wczytaj z pliku
    if( lastModTime < REFRESH_TIME ) {
        fs.readFile('weather.json', 'utf8', function (err, data) {
            if (err) {
                return console.log(err);
            }
            var weatherTab = JSON.parse(data);
            
            edgeCoordinates = [];
            for( var i=0; i < weatherTab.length; i++ ) {
                edgeCoordinates.push({ 
                    latitude: Number(weatherTab[i].latitude),
                    longitude : Number(weatherTab[i].longitude)
                });
                weatherMap[String(weatherTab[0].latitude) + ' ' + String(weatherTab[0].longitude)] = weatherTab[i];
            }
        });
    }
});

var refreshWeatherInformation = function() {
    var coords = [];
    // podziel terytorium Polski na siatke
    for( var x=0; x < XX; x++ ) {
        for(var y=0; y < YY; y++) {
            var coord = {};
            // szerokosc geograficzna
            coord.latitude = downMost + ( dy / YY ) * y + ( dy / ( YY * 2 ) );
            // dlugosc geograficzna
            coord.longitude = leftMost + ( dx / XX ) * x + ( dx / ( XX * 2 ) );

            coords.push( coord );
        }
    }

    var getWeatherJson = function( latitude, longitude ) {
        var d = Q.defer();
        forecast.get([coords[i].latitude, coords[i].longitude], true, function(err, weather) {
            d.resolve( [latitude, longitude, weather] );
        });
        return d.promise;
    };

    var qs = [];
    edgeCoordinates = [];
    // make api calls for weather
    for( var i=0; i < coords.length; i++ ) {
        qs.push( getWeatherJson( coords[i].latitude, coords[i].longitude ).then( function( params ) {
            edgeCoordinates.push({ 
                latitude: params[0],
                longitude : params[1]
            });
            weatherMap[String(params[0]) + ' ' + String(params[1])] = params[2];
        }) );
    }

    Q.all( qs ).done( function( ) {
        var weatherTab = [];
        for( var weatherInfo in weatherMap ) {
            weatherTab.push( weatherMap[weatherInfo] );
        }

        fs.writeFile('weather.json', JSON.stringify(weatherTab, null, 4), function( err, data ) {
            console.log( 'weather.json saved' );
        });
    });
    setTimeout( refreshWeatherInformation, REFRESH_TIME * 1000 );
};

exports.getWeather = function( latitude, longitude ) {
    var found = false;
    
    for( var i=0; i < edgeCoordinates.length; i++ ) {
        if( latitude > ( edgeCoordinates[i].latitude - ( dy / ( YY * 2 ) ) ) && latitude < ( edgeCoordinates[i].latitude + ( dy / ( YY * 2 ) ) ) ) {
            if( longitude > ( edgeCoordinates[i].longitude - ( dx / ( XX * 2 ) ) ) && longitude < ( edgeCoordinates[i].longitude + ( dx / ( XX * 2 ) ) ) ) {
                found =  true;
                return weatherMap[String(edgeCoordinates[i].latitude) + ' ' + String(edgeCoordinates[i].longitude)];
            }
        }
    }
    if( !found ) {
        return {
            state: -1,
            err: "We do not support weather information in your country. Sorry"
        };
    }
};
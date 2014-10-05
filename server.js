var express = require('express');
var http = require('http');
var pg = require('pg');
var fs = require('fs');
var app = express();
var server = http.createServer(app);
var html = fs.readFileSync('./index.html');
var bodyParser = require('body-parser')
var Forecast = require('forecast');
var Q = require('Q');

app.use(bodyParser.json());

var conString = "postgres://bttjzotgxwisqf:6vvG9vGhNRns3RBH7XcoJhqYMc@ec2-184-72-231-67.compute-1.amazonaws.com:5432/daj5aah1m705ur";

// Initialize forecast
var forecast = new Forecast({
	service: 'forecast.io',
	key: '00cedfc6ff3daf7d397f990b4133e3d8',
	units: 'celcius', // Only the first letter is parsed
	cache: true,      // Cache API requests?
	ttl: {            // How long to cache requests. Uses syntax from moment.js: http://momentjs.com/docs/#/durations/creating/
		minutes: 27,
		seconds: 45
	}
});

// left most = 14.117
// right most = 24.133
// top most = 54.833
// down most = 49.000
var leftMost = 14.117;
var downMost = 49.000;
var dx = 24.133 - leftMost;
var dy = 54.833 - downMost;

var coords = [];
// split Poland territory into mesh
for( var x=0; x < 2; x++ ) {
	for(var y=0; y < 2; y++) {
		var coord = {};
		// szerokosc geograficzna
		coord.latitude = downMost + ( dy / 2 ) * y;
		// dlugosc geograficzna
		coord.longitude = leftMost + ( dx / 2 ) * x;
		
		coords.push( coord );
	}
}

var getWeatherJson = function( latitude, longitude ) {
	var d = Q.defer();
	forecast.get([coords[i].latitude, coords[i].longitude], true, function(err, weather) {
		d.resolve( [latitude, longitude, weather] );
	});
	return d.promise;
}

var weatherMap = [];

var qs = [];
// make api calls for weather
for( var i=0; i < coords.length; i++ ) {
	
	qs.push( getWeatherJson( coords[i].latitude, coords[i].longitude ).then( function( params ) {
		weatherMap[String(params[0]) + ' ' + String(params[1])] = params[2];
	}) );
}

Q.all( qs ).done( function( ) {
	console.log( 'All data saved' );
	for( var weatherInfo in weatherMap ) {
		console.log( weatherMap[weatherInfo] );
	}
});

var x, y;
app.get('/weather/:x/:y', function(req, res) {
	forecast.get([req.param('x'), req.param('y')], true, function(err, weather) {
	  // if(err) return console.dir(err);
		res.send(weather);
	});
});

app.get('/', function(req, res) {
    
    // var client = new pg.Client(conString);
	var client = new pg.Client({
		user: "bttjzotgxwisqf",
		password: "6vvG9vGhNRns3RBH7XcoJhqYMc",
		database: "daj5aah1m705ur",
		port: 5432,
		host: "ec2-184-72-231-67.compute-1.amazonaws.com",
		ssl: true
	}); 
    client.connect();
  
    res.writeHead(200, {'Content-Type': 'text/html'});
  
	// res.end( 'Hello world' );
    var resContent = "<!DOCTYPE html><html><body><h1>Data base content</h1><table style=\"width:300px\">";
  
    var query = client.query("SELECT firstname, lastname FROM emps ORDER BY lastname, firstname");
    query.on("row", function (row, result) {
        result.addRow(row);
    });
    query.on("end", function (result) {
      for( var i=0; i < result.rows.length; i++ ) {
        resContent += "<tr><td>" + result.rows[i].firstname + "</td><td>" + result.rows[i].lastname + "</td></tr>";
      }
      
      resContent += "</table></body></html>";
      res.end(resContent);
      client.end();
    });
  
});

app.post('/post', function(req, res) {
    console.log( req.body.firstname, req.body.lastname );
    var client = new pg.Client(conString);
    client.connect();
    var query = client.query("INSERT INTO emps(firstname, lastname) values($1, $2)", [req.body.firstname, req.body.lastname]);
    query.on('end', client.end.bind(client));
  
    res.send(req.body);    // echo the result back
});

server.listen(3000);
console.log('Express server started on port %s', server.address().port);

// client.query("CREATE TABLE IF NOT EXISTS emps(firstname varchar(64), lastname varchar(64))");
// client.query("INSERT INTO emps(firstname, lastname) values($1, $2)", ['Ronald', 'McDonald']);
// client.query("INSERT INTO emps(firstname, lastname) values($1, $2)", ['Mayor', 'McCheese']);

// client.query("DROP TABLE emps");



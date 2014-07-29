var express = require('express');
var http = require('http');
var pg = require('pg').native;

var conString = "postgres://bttjzotgxwisqf:6vvG9vGhNRns3RBH7XcoJhqYMc@ec2-184-72-231-67.compute-1.amazonaws.com:5432/daj5aah1m705ur";
var client = new pg.Client(conString);
client.connect();

var query = client.query("DELETE FROM emps");
query.on('end', client.end.bind(client));
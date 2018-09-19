/*
* PRIMARY FILE FOR API
*
*/

// DEPENDECIES
var server = require('./lib/server.js');
var workers = require('./lib/workers.js');

// DECLARE THE APP
var app = {};

// INIT FUNCTION
app.init = () => {
	// START THE SERVER
	server.init();
	// START THE WORKERS
	workers.init();
};

// EXECUTE
app.init();

// EXPORT TE APP
module.exports = app;
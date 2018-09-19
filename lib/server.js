/*
* SERVER RELATED TASKS
*
*/

const http = require('http');
const https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var handlers = require('./handlers');
var helpers = require('./helpers');
var path = require('path');

// Instantiate the server module object
var server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer((req,res) => {
	server.unifiedServer(req, res);
});

//Instantiate the HTTPS server
/*server.httpsServerOptions = {
	'key' : fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
	'cert' : fs.readFileSync(path.join(__dirname, '/../https/cert.pem')
};
server.httpsServer = https.createServer(server.httpsServerOptions, (req,res) => {
	server.unifiedServer(req, res);
});*/


// All the server logic for both http/s server
server.unifiedServer = ((req, res) => {
	//GET THE URL AND PARSE IT
	var parsedUrl = url.parse(req.url,true);

	//GET THE PATH
	var path = parsedUrl.pathname;
	var trimmedPath = path.replace(/^\/+|\/+$/g, '');

	//get the querystring as an object
	var queryStringObject = parsedUrl.query;
	
	// get the http method
	var method = req.method.toLowerCase();

	// get the header as an object
	var headers = req.headers;

	//get the payload if there is any
	var decoder = new StringDecoder('utf-8');
	var buffer= '';
	req.on('data', data => {
		buffer += decoder.write(data);
	});
	req.on('end', () => {
		buffer += decoder.end();

		// choose the handler this request should go to.if one is not found use notfound handler
    var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

		//construct the data object to send to the handler
		var data = {
			'trimmedPath' : trimmedPath,
			'queryStringObject' : queryStringObject,
			'method' : method,
			'headers' : headers,
			'payload' : helpers.parseJsonToObject(buffer)
		};

		// route the request to the handler specified in the router
		chosenHandler(data, (statusCode, payload) => {
			// use the status code called back by the handler, or default to 200
			statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

			// use the payload called back by the handler, or default to an empty object
			payload = typeof(payload) == 'object' ? payload : {};

			// convert the payload to a string
			var payloadString = JSON.stringify(payload);

			//return the response
      res.setHeader('Content-Type', 'application/json');
			res.writeHead(statusCode);
			res.end(payloadString);

			// log request
			if (statusCode == 200) {
				console.log('\x1b[32m%s\x1b[0m',`${method.toUpperCase()} /${trimmedPath} ${statusCode}`);
			} else {
				console.log('\x1b[31m%s\x1b[0m',`${method.toUpperCase()} /${trimmedPath} ${statusCode}`);
			}
		});
	});
});

// define a quest router
server.router = {
	'ping': handlers.ping,
	'users': handlers.users,
	'tokens' : handlers.tokens,
	'checks' : handlers.checks
};

// Init script
server.init = () => {
	// start http server
	server.httpServer.listen(config.httpPort, () => {
		console.log('\x1b[36m%s\x1b[0m', `server is now listen port ${config.httpPort} in ${config.envName} mode`);
	});

	// Start the HTTPS Server
	/*server.httpsServer.listen(config.httpsPort, () => {
		console.log('\x1b[35m%s\x1b[0m', `server is now listen port ${config.httpsPort} in ${config.envName} mode`);
	});*/
};

// export the module
module.exports = server;
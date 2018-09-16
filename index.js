const http = require('http');
const https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./lib/config');
var fs = require('fs');
var handlers = require('./lib/handlers');
var helpers = require('./lib/helpers');

// get rid of this
helpers.sendTwilioSms('0899436541', 'Hello!', (err) => {
	console.log('this was the error', err);
});

// Instantiate the HTTP server
const httpServer = http.createServer((req,res) => {
	unifiedServer(req, res);
});

// start the server
httpServer.listen(config.httpPort, () => {
	console.log(`server is now listen port ${config.httpPort} in ${config.envName} mode`);
});

//Instantiate the HTTPS server
/*var httpsServerOptions = {
	'key' : fs.readFileSync('./https/key.pem'),
	'cert' : fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions, (req,res) => {
	unifiedServer(req, res);
});*/
// Start the HTTPS Server
/*httpsServer.listen(config.httpsPort, () => {
	console.log(`server is now listen port ${config.httpsPort} in ${config.envName} mode`);
});*/

// All the server logic for both http/s server
var unifiedServer = ((req, res) => {
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
    var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

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
			console.log('Returning this response = ', statusCode, payloadString);
		});
	});
});

// define a quest router
var router = {
	'ping': handlers.ping,
	'users': handlers.users,
	'tokens' : handlers.tokens,
	'checks' : handlers.checks
};
const http = require('http');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;

// THE SERVER SHOULD RESPONDTO ALL REQUEST WITH A STRING
const server = http.createServer((req,res) => {

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
			'payload' : buffer
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

server.listen(3000, () => {
	console.log('server is now listen port 3000');
});

//define the handlers
var handlers = {};

// sample handler
handlers.sample = (data, callback) => {
	// callback a http status code, and a payload object
	callback(406, {'name' : 'sample handler'});
};

//not found handler
handlers.notFound = (data, callback) => {
	callback(404);
}

// define a quest router
var router = {
	'sample': handlers.sample
};
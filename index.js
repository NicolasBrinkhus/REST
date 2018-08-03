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
	})
	req.on('end', () => {
		buffer += decoder.end();
		// response
		res.end('Hello World\n');
		
		// log request
		console.log('payload = ', buffer);
	})
});

server.listen(3000, () => {
	console.log('server is now listen port 3000');
});
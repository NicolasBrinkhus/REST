/*
* Helpers for various tasks
*/
// dependecies
var crypto = require('crypto');
var config = require('./config');
var http = require('http');
var querystring = require('querystring');

// Container for the all helpers
var helpers = {};

// Create a SHA256 hash
helpers.hash = (str) => {
	if (typeof(str) == 'string' && str.length > 0) {
		var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
		return hash;
	} else {
		return false;
	}
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = (str) => {
	try{
		var obj = JSON.parse(str);
		return obj
	} catch(e) {
		return {};
	}
};

// Create a string of random alphanumeric character, of a given length
helpers.createRandomString = (strLength) => {
	strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
	if (strLength) {
		// Define all the possible characters that could go into the string
		var possibleCharacters = 'abcdefghijlmnopqrstuvwxyz0123456789';

		// start the final string
		var str= '';
		for (var i = 0; i <= strLength; i++) {
			var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
			str+=randomCharacter;
		}
		// return final sting
		return str;
	} else {
		return false;
	}
}

// Send an SMS message via Twilio
helpers.sendTwilioSms = (phone, msg, callback) => {
	// validate the params
	phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
	msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
	if (phone && msg) {
		// Config the request payload
		var payload = {
			'From' : config.twilio.fromPhone,
			'to' : '+353'+phone,
			'Body' : msg
		};
		// Stringify the payload
		var stringPayload = querystring.stringify(payload);

		// Config the request details
		var requestDetails = {
			'protocol' : 'http:',
			'hostname' : 'api.twilio.com',
			'method' : 'POST',
			'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'Messages.json',
			'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
			'headers' : {
				'Content-Type' : 'application/x-www-form-urlencoded',
				'Content-Length' : Buffer.byteLength(stringPayload)
			}
		};

		// Instantiate the request obj
		var req = http.request(requestDetails, (res) => {
			// Grab the status of the sent request
			var status = res.statusCode;
			// Callback successfylly if the request went through
			if (status == 200 || status == 201) {
				callback(false);
			} else {
				callback(`Status code returned was ${status}`);
			}
		});

		//Bind to the error event so it doesn't get thrown
		req.on('error', (e) => {
			callback(e);
		});

		// Add the payload
		req.write(stringPayload);

		// End the request
		req.end();
	} else {
		callback('Given parameters were missing or invalid');
	}
};

// Exports
module.exports = helpers;
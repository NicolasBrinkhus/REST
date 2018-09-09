/*
* Helpers for various tasks
*/
// dependecies
var crypto = require('crypto');
var config = require('./config');

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

// Exports
module.exports = helpers;
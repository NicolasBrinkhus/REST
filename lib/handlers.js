/*
* Request handlers
*/
// dependecies
var _data = require('./data');
var helpers = require('./helpers');

//define the handlers
var handlers = {};

// Users
handlers.users = (data, callback) => {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._users[data.method](data, callback);
	} else {
		callback(405);
	}
};

// Container for the users submethods
handlers._users = {};

// Users - post
// required data: firstName, lastName, phone, passwprd, tosAgreement
//optional data: none
handlers._users.post = (data, callback) => {
	// Check the all required fields are filled out
	var firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
	var lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
	var phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
	var password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
	var tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement == true ? true : false;
	
	if (firstName && lastName && phone && password && tosAgreement) {
		// Make sure that the user doesnt already exist
		_data.read('users', phone, (err, data) => {
			if (err) {
				// hash the password
				var hashedPassword = helpers.hash(password);

				//Create the user obj
				if (hashedPassword) {
					var userObject = {
					firstName : firstName,
					lastName : lastName,
					phone : phone,
					hashedPassword : hashedPassword,
					tosAgreement : true
				}
					//store the user
					_data.create('users', phone, userObject, (err) => {
						if (!err) {
							callback(200);
						} else {
							console.log(err);
							callback(500, {'Error' : 'Could not create the new user'});
						}
					});
				} else {
					callback(500, {'Errod' : 'Could not hash the user password'});
				}
				
			} else {
				callback(400, {Error : 'A user with that phone number already exist'});
			}
		});
	} else {
		callback(400, {'Error' : 'Missing required Fields'});
	}
};

// Users - get
// required data: phone
// optional: none
// @TODO only let an authenticated user access their object. Dont let them access anyone else
handlers._users.get = (data, callback) => {
	// Check the phone number is valid
	var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
	if (phone) {
		// look up the user
		_data.read('users', phone, (err,data) => {
			if (!err && data) {
				// Remove the hashed pass from the user object before returning to the requested
				delete data.hashedPassword;
				callback(200, data);
			} else {
				callback(404);
			}
		});
	} else {
		callback(400, {'Error' : 'Missing required field'})
	}
};

// Users - put
// required : phone
// optional : firstName, lastName, password (at least one must be specified)
// only let an authenticated user update their own object. not anyone else
handlers._users.put = (data, callback) => {
	// check for the required field	
	var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

	// check for the optional fields
	var firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
	var lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
	var password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
	
	// error if the phone is invalid
	if (phone) {
		if (firstName || lastName || password) {
			// error if nothing is sent to update
			_data.read('users', phone, (err, userData) => {
				if (!err && userData) {
					//update the fields necessery
					if (firstName) {
						userData.firstName = firstName;
					}
					if (lastName) {
						userData.lastName = lastName;
					}
					if (password) {
						userData.hashedPassword = helpers.hash(password);
					}
					// Store the new updates
					_data.update('users', phone, userData, (err) => {
						if (!err) {
							callback(200);
						} else {
							console.log(err);
							callback(500, {'Error': 'Could not update the user'});
						}
					});
				} else {
					callback(400, {'Error' : 'The specifed user dosnt exist'});
				}
			});
		} else {
			callback(400, {'Error': 'Missing fields to update'});
		}
	} else {
		callback(400, {'Error': 'Missing required field'});
	}
};

// Users - delete
// required: phone
// only let an authenticated user delete their own object.
// cleanup any other files associate with this user
handlers._users.delete = (data, callback) => {
	// check that the phone number is valid
	var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
	if (phone) {
		// look up the user
		_data.read('users', phone, (err,data) => {
			if (!err && data) {
				_data.delete('users', phone, (err) => {
					if (!err) {
						callback(200);
					} else {
						callback(500, {'Error': 'Could not delete specified user'});
					}
				});
			} else {
				callback(400, {'Error': 'Could not find the specifed user'});
			}
		});
	} else {
		callback(400, {'Error' : 'Missing required field'})
	}
};
//ping handler
handlers.ping = (data, callback) => {
	callback(200);
};

//not found handler
handlers.notFound = (data, callback) => {
	callback(404);
}


module.exports = handlers;
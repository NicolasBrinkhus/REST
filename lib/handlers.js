/*
* Request handlers
*/
// dependecies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');

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
handlers._users.get = (data, callback) => {
	// Check the phone number is valid
	var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
	if (phone) {
		//get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
		console.log(token);
		// verify that the given token is valid for the phone number
		handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
			console.log(tokenIsValid);
			if (tokenIsValid) {
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
				callback(403, {'Error': 'Missing require token in header or token is invalid'});
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
			//get the token from the headers
			var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
			// verify that the given token is valid for the phone number
			handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
				if (tokenIsValid) {
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
					callback(403, {'Error': 'Missing require token in header or token is invalid'});
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
handlers._users.delete = (data, callback) => {
	// check that the phone number is valid
	var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
	if (phone) {
		//get the token from the headers
		console.log(data);
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
		// verify that the given token is valid for the phone number
		handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
			if (tokenIsValid) {
				// look up the user
				_data.read('users', phone, (err,userData) => {
					if (!err && userData) {
						_data.delete('users', phone, (err) => {
							if (!err) {
								// Delete each of the checks associated with the user
								var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []; 
								var checksToDelete = userChecks.length;
								if (checksToDelete > 0) {
									var checksDeleted = 0;
									var deletionErrors = false;
									// loop through thechecks
									userChecks.forEach((checkId) => {
										//Delete the check
										_data.delete('checks', checkId, (err) => {
											if (err) {
												deletionErrors = true;
											}
											checksDeleted++;
											if (checksDeleted == checksToDelete) {
												if (!deletionErrors) {
													callback(200);
												} else {
													callback(500, {'Error':'Errors encountered while attempting to delete all of the users checks'});
												}
											}
										});
									});
								} else {
									callback(200);
								}
							} else {
								callback(500, {'Error': 'Could not delete specified user'});
							}
						});
					} else {
						callback(400, {'Error': 'Could not find the specifed user'});
					}
				});
			} else {
				callback(403, {'Error': 'Missing require token in header or token is invalid'});
			}
		});
	} else {
		callback(400, {'Error' : 'Missing required field'})
	}
};

// Tokens
handlers.tokens = (data, callback) => {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._tokens[data.method](data, callback);
	} else {
		callback(405);
	}
};

//Container for all the tokens method
handlers._tokens = {};

// Tokens - post
// required data: phone, password
handlers._tokens.post = (data, callback) => {
	var phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
	var password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
	if (phone && password) {
		// look up the user who matches that phone number
		_data.read('users', phone, (err, userData) => {
			if (!err && userData) {
				//hash the sent password and compare it.
				var hashedPassword = helpers.hash(password);
				if (hashedPassword == userData.hashedPassword) {
					// if valid, create a new token with random name; set experation 1 hour
					var tokenId = helpers.createRandomString(20);
					var expires = Date.now() + 1000 * 60 * 60;
					var tokenObject = {
						'phone' : phone,
						'id' : tokenId,
						'expires' : expires
					};
					//store the token
					_data.create('tokens', tokenId, tokenObject, (err) => {
						if (!err) {
							callback(200, tokenObject);
						} else {
							callback(500, {'Error': 'Could not create the new token'});
						}
					});
				} else {
					callback(400, {'Error': 'Password did not match the specifed user'});
				}
			} else {
				callback(400, {'Error': 'Could not find the specified user'});
			}
		});
	} else {
		callback(400, {'Error': 'Missing required fields'});
	}
};

// Tokens - get
// required data: id
handlers._tokens.get = (data, callback) => {
	// Check that the id is valid
	var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 21 ? data.queryStringObject.id.trim() : false;
	if (id) {
		// look up the token
		_data.read('tokens', id, (err,tokenData) => {
			if (!err && tokenData) {
				callback(200, tokenData);
			} else {
				callback(404);
			}
		});
	} else {
		callback(400, {'Error' : 'Missing required field'})
	}
};

// Tokens - put
//required: id, extend
handlers._tokens.put = (data, callback) => {
	var id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length == 21 ? data.payload.id.trim() : false;
	var extend = typeof(data.payload.extend) === 'boolean' && data.payload.extend == true ? true : false;
	if (id && extend) {
		// lookup the token
		_data.read('token', id, (err, tokenData) => {
			if (!err && tokenData) {
				// check to the make sure the token isnt already expired
				if (tokenData.expires > Date.now()) {
					// set the expiration an hour from now
					tokenData.expires = Date.now() + 1000 * 60 * 60;
					//store the new updates
					_data.update('tokens', id, tokenData, (err) => {
						if (!err) {
							callback(200);
						} else {
							callback(500, {'Error': 'Could not update the token expiration'});
						}
					});
				} else {
					callback(400, {'Error': 'The token has already expired cannot be extended'});
				}
			} else{
				callback(400, {'Error': 'Specifed token does not exist!'});
			}
		});
	} else {
		callback(400, {'Error' : 'Missinf required fields, or fields are invalid'});
	}
};

// Tokens - delete
// required data: id
handlers._tokens.delete = (data, callback) => {
	// check that the id is valid
	var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 21 ? data.queryStringObject.id.trim() : false;
	if (id) {
		// look up the tokens
		_data.read('tokens', id, (err,data) => {
			if (!err && data) {
				_data.delete('tokens', id, (err) => {
					if (!err) {
						callback(200);
					} else {
						callback(500, {'Error': 'Could not delete specified token'});
					}
				});
			} else {
				callback(400, {'Error': 'Could not find the specifed token'});
			}
		});
	} else {
		callback(400, {'Error' : 'Missing required field'})
	}
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
	//lookup the token
	_data.read('tokens', id, (err, tokenData) => {
		if (!err && tokenData) {
			if (tokenData.phone == phone && tokenData.expires > Date.now()) {
				callback(true);
			} else {
				callback(false);
			}
		} else {
			callback(false);
		}
	});
};

// Checks
handlers.checks = (data, callback) => {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if (acceptableMethods.indexOf(data.method) > -1) {
		handlers._checks[data.method](data, callback);
	} else {
		callback(405);
	}
};

// Container for all the checks methods
handlers._checks= {};

//checks - post
// required data: protocol, url, method, successCodes, timeoutSeconds

handlers._checks.post = (data, callback) => {
	// Validate inputs
	var protocol = typeof(data.payload.protocol) === 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
	var url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
	var method = typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
	var successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
	var timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

	if (protocol && url && method && successCodes && timeoutSeconds) {
		// Check if user have provide the token
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
		// Lookup the user by reading the token
		_data.read('tokens', token, (err, tokenData) => {
			if (!err && tokenData) {
				var userPhone = tokenData.phone;
				//lookup the user data
				_data.read('users', userPhone, (err, userData) => {
					if (!err && userData) {
						var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []; 
						//Verify that the user has less than the number of max-checks-per-user
						if (userChecks.length < config.maxChecks) {
							// Create a random id for the check
							var checkId = helpers.createRandomString(20);

							// Create the check Obj, and include the user phone
							var checkObject = {
								'id' : checkId,
								'userPhone' : userPhone,
								'protocol' : protocol,
								'url': url,
								'method' : method,
								'successCodes' : successCodes,
								'timeoutSeconds' : timeoutSeconds
							};

							// Save the object
							_data.create('checks', checkId, checkObject, (err) => {
								if (!err) {
									// Add the check id to the users obj
									userData.checks = userChecks;
									userData.checks.push(checkId);

									// Save the new user data
									_data.update('users', userPhone, userData, (err) => {
										if (!err) {
											// Return the data about the new check
											callback(200, checkObject);
										} else {
											callback(500, {'Error' : 'Could not update the user with new check'});
										}
									});
								} else {
									callback(500, {'Error' : 'Could not create the new check'});
								}
							});
						} else {
							callback(400, {'Error' : 'The user already has the maximum number of checks'});
						}
					} else {
						callback(403);
					}
				});
			} else {
				callback(403);
			}
		});
	} else {
		callback(400, {'Error' : 'Missing required inputs, or inputs are invalid'});
	}
};

// Checks - get
// required data: id
handlers._checks.get = (data, callback) => {
	// Check the phone number is valid
	var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 21 ? data.queryStringObject.id.trim() : false;
	if (id) {
		// lookup the check
		_data.read('checks', id, (err, checkData) => {
			if (!err && checkData) {
				//get the token from the headers
				var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
				// verify that the given token is valid and belongs to the user who creates the check
				handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
					if (tokenIsValid) {
						// Return the check data
						callback(200, checkData);
					} else {
						callback(403);
					}
				});
			} else {
				callback(404);	
			}
		});
	} else {
		callback(400, {'Error' : 'Missing required field'})
	}
};

// Checks - put
// required data: id
// optional data: protocol, url, method, successCodes, timeoutSeconds
handlers._checks.put = (data, callback) => {
	// check for the required field	
	var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 21 ? data.payload.id.trim() : false;

	// check for the optional fields
	// Validate inputs
	var protocol = typeof(data.payload.protocol) === 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
	var url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
	var method = typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
	var successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
	var timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
	// Check to make sure ids is valid
	if (id) {
		// check to make sure one or more optional fields has been send
		if (protocol || url || method || successCodes || timeoutSeconds) {
			// lookup the check
			_data.read('checks', id, (err, checkData) => {
				if (!err && checkData) {
					var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
					// verify that the given token is valid and belongs to the user who creates the check
					handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
						if (tokenIsValid) {
							// update the cehck where necessary
							if (protocol) {
								checkData.protocol = protocol;
							}
							if (url) {
								checkData.url = url;
							}
							if (method) {
								checkData.method = method;
							}
							if (successCodes) {
								checkData.successCodes = successCodes;
							}
							if (timeoutSeconds) {
								checkData.timeoutSeconds = timeoutSeconds;
							}
							//Store the new updates
							_data.update('checks', id, checkData, (err) => {
								if (!err) {
									callback(200);
								} else{
									callback(500, {'Error': 'Could not update the check'});
								}
							});
						} else {
							callback(403);
						}
					});
				} else {
					callback(400, {'Error': 'Check id did not exist'});
				}
			});
		} else {
			callback(400, {'Error' : 'Missing fields to update'});
		}
	} else {
		callback(400, {'Error': 'Missing required field'});
	}
};

// Checks - delete
// required data: id
handlers._checks.delete = (data, callback) => {
	// check that the phone number is valid
	var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 21 ? data.queryStringObject.id.trim() : false;
	if (id) {
		// lookup the check
		_data.read('checks', id, (err, checkData) => {
			if (!err && checkData) {
				//get the token from the headers
				var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
				// verify that the given token is valid for the phone number
				handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
					if (tokenIsValid) {
						// delete the check dat
						_data.delete('checks', id, (err) => {
							if (!err) {
								// look up the user
								_data.read('users', checkData.userPhone, (err,userData) => {
									if (!err && userData) {
										var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
										// remove the deleted check from their list of checks
										var checkPosition = userChecks.indexOf(id);
										if (checkPosition > -1) {
											userChecks.splice(checkPosition, 1);
											// re-save the user data
											_data.update('users', checkData.userPhone, userData, (err) => {
												if (!err) {
													callback(200);
												} else {
													callback(500, {'Error': 'Could not update the user'});
												}
											});
										} else {
											callback(500, {'Error' : 'Could find the check on the user object'});
										}
									} else {
										callback(500, {'Error': 'Could not find the user who created the checks, so could not remove the check from the list of checks'});
									}
								});
							} else {
								callback(500, {'Error': 'Could not delete the check data'});
							}
						});
					} else {
						callback(403);
					}
				});	
			} else {
				callback(400, {'Error': 'The specified check id does not exist'});
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
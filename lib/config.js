// container for all the environments
var environments = {};

// Staging (default) environment
environments.staging = {
	'httpPort' : 3000,
	'httpsPort' : 3001,
	'envName' : 'staging',
	'hashingSecret' : 'thisIsSecret',
	'maxChecks' : 5,
	'twilio' : {
		'accountSid' : 'ACf3be89412ffecc7f24962bb4df0ea0b2',
		'authToekn' : 'f41423827221dcf49834cc788963d5f7',
		'fromPhone' : '+15392320713'
	}
};

// production environment
environments.production = {
	'httpPort' : 5000,
	'httpsPort' : 5001,
	'envName' : 'production',
	'hashingSecret' : 'thisIsAlsoSecret',
	'maxChecks' : 5,
	'twilio' : {
		'accountSid' : '',
		'authToekn' : '',
		'fromPhone' : ''
	}
};

// determine whuch environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// check that the current environments is one of the environments above, if not, default the staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

//export the module
module.exports = environmentToExport;
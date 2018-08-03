// container for all the environments
var environments = {};

// Staging (default) environment
environments.staging = {
	'port' : 3000,
	'envName' : 'staging'
};

// production environment
environments.production = {
	'port' : 5000,
	'envName' : 'production'
};

// determine whuch environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// check that the current environments is one of the environments above, if not, default the staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

//export the module
module.exports = environmentToExport;
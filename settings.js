module.exports = Object.freeze({
//Configuration
	accountId: "", // Your account ID - Mandatory
	apiId: "", // Your api id - Mandatory
	apiKey: "",  // Your api key - Mandatory
	checkOriginServers: true, // When set to true, origin servers protection will be validated, this may take a longer time
	getSubAccountsInfo:true, // When set to true, Sub accounts are also listed, this may take a longer time
	showFullDetails: false, // When set to true, the setting details are listed per site

	title: "", //When empty string it will use the account name as defined in MY

//File
	fileName: "", // When empty string it will use the account name as defined in MY
	filePath: "", // Path where files should be saved, path must be previously created. Format must be as this example if you want to save in data directory in the current installed folder - ./data/
	addTimestamp: false, // Set to true if you want timestamp appended to the filename
	saveCsv: true, // Set to true if you want csv files as well as the html file
	originServerFileNamePrefix: "", // When empty string will use 'Origin-servers' String used as prefix for origin server csv file

// Advanced configuration

	//When origin servers are checked, if one of these codes is returned, it implies that the origin server was NOT reached - it is protected
	// Some common error codes can be found in https://nodejs.org/api/errors.html
	originServerProtectedCode: [
		"EAI_AGAIN", // This is a DNS lookup timed out error means it is either a network connectivity error or some proxy related error
		"ECONNREFUSED", //(Connection refused): No connection could be made because the target machine actively refused it. This usually results from trying to connect to a service that is inactive on the foreign host. (from https://www.codingdefined.com/2015/06/nodejs-error-errno-eaiagain.html)
		"ECONNRESET", //(Connection reset by peer): A connection was forcibly closed by a peer. This normally results from a loss of the connection on the remote socket due to a timeout or reboot. Commonly encountered via the http and net modules
		"ENOTFOUND", //(DNS lookup failed): Indicates a DNS failure of either EAI_NODATA or EAI_NONAME. This is not a standard POSIX error
		"ETIMEDOUT" //(Operation timed out): A connect or send request failed because the connected party did not properly respond after a period of time. Usually encountered by http or net — often a sign that a socket.end() was not properly called
	],

	/* These settings will defines per rule if protected. Per rule (id). The received paramters values from the API are compared and if equal to 
		the value of the parameter, it means it that the field will be displayed as 'protected'. 
	*/
	protectionDisplay : [
		{
			"action": "api.threats.action.block_request",
			"id": "api.threats.cross_site_scripting"
		},
		{
			"action": "api.threats.action.block_request",
			"id": "api.threats.sql_injection",
		},
		{
			"action": "api.threats.action.block_request",
			"id": "api.threats.cross_site_scripting",
		},
		{
			"action": "api.threats.action.block_request",
			"id": "api.threats.illegal_resource_access",
		},
		{
			"block_bad_bots": true,
			"challenge_suspected_bots": true,
			"id": "api.threats.bot_access_control",
		},
		{
		//ddos is a special case since there is more than one value. Currently code is changed only for this field but can be used as an example if others are required in the future
			"value" :  [
				{"activation_mode": "api.threats.ddos.activation_mode.on"},
				{"activation_mode": "api.threats.ddos.activation_mode.auto"},
			],
			"id": "api.threats.ddos",
		},
		{
			"action": "api.threats.action.quarantine_url",
			"id": "api.threats.backdoor",
		},
		{
			"action": "api.threats.action.block_request",
			"id": "api.threats.remote_file_inclusion",
		}
	],

	printDebugInfo: false,
	numConcurrentConnections: 15, //Number of concurrent open API sessions

	/*After this time the connection request will timeout. Note that if the number is too low it may cause timeout before server actually responds 
		which implies server is protected */
	originServerConnectionTimeout: 10000, //(In milliseconds)
	
	pageSize: 100 //Internal usage

});

	

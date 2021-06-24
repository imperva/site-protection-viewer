module.exports = Object.freeze({
	//Configuration
	accountId: "", // Your account ID - Mandatory
	apiId: "", // Your api id - Mandatory
	apiKey: "",  // Your api key - Mandatory

	checkOriginServers: true, // When set to true, origin servers protection will be validated, this may take a longer time
	getSubAccountsInfo: true, // When set to true, Sub accounts are also listed, this may take a longer time
	getAttackAnalyticsInfo: true, // When set to true Attack Analytics info is also displayed if licensed. This may take a longer time. When set to true, getSubAccountsInfo must also be true
	showFullDetails: false, // When set to true, the setting details are listed per site. 
	useLegacyDisplay: false, // When set to true, html display will be as was before version 2 of this tool.

	attackAnalyticsPeriodInDays: 0, //How many days back should info be provided? E.g. 'Last n Days' 0 = All.

	title: "", //When empty string it will use the account name as defined in MY

//File
	fileName: "", // When empty string it will use the account name as defined in MY
	filePath: "", // Path where files should be saved, path must be previously created. Format must be as this example if you want to save in data directory in the current installed folder - ./data/
	addTimestamp: false, // Set to true if you want timestamp appended to the filename
	saveCsv: true, // Set to true if you want csv files as well as the html file
	originServerFileNamePrefix: "", // When empty string will use 'Origin-servers' String used as prefix for origin server csv file
	attackAnalyticsFileNamePrefix: "", // When empty string will use 'Attack-Analytics' String used as prefix for Attack Analytics csv file

// Advanced configuration
	//When origin servers are checked, if one of these codes is returned, it implies that the origin server was NOT reached - it is protected
	// Some common error codes can be found in https://nodejs.org/api/errors.html
	originServerProtectedCode: [
		"ETIMEDOUT", //(Operation timed out): A connect or send request failed because the connected party did not properly respond after a period of time. Usually encountered by http or net � often a sign that a socket.end() was not properly called
		"EAI_AGAIN", // This is a DNS lookup timed out error means it is either a network connectivity error or some proxy related error
		"ECONNREFUSED", //(Connection refused): No connection could be made because the target machine actively refused it. This usually results from trying to connect to a service that is inactive on the foreign host. (from https://www.codingdefined.com/2015/06/nodejs-error-errno-eaiagain.html)
		"ECONNRESET", //(Connection reset by peer): A connection was forcibly closed by a peer. This normally results from a loss of the connection on the remote socket due to a timeout or reboot. Commonly encountered via the http and net modules
		"ENOTFOUND", //(DNS lookup failed): Indicates a DNS failure of either EAI_NODATA or EAI_NONAME. This is not a standard POSIX error
        "ESOCKETTIMEDOUT"
    ],

	//When origin servers are checked, if an http code is returned, it implies that the origin server was NOT reached - it is protected.
	// For example, we are aware that in several cases, http code 403 implies that actual server can't be accessed.
	originServerHttpProtectedCode: [
		//403
	],

    /* These ports will be scanned in the origin server check. You can add/remove per your need. 
        Request will be with be http or https with set port number.
        */
		originServerPorts: [
			{"protocol": "http", "portNum" : 80},
			{"protocol": "http", "portNum" : 8080},
			{"protocol": "https", "portNum" : 443},
			{"protocol": "https", "portNum" : 8443},
		],

	/* These settings will defines per rule if protected. Per rule (id). The received paramters values from the API are compared and if equal to 
		the value of the parameter, it means it that the field will be displayed as 'protected'. 
		Current values reflect the default settings when creating a new website.
		*/
	protectionDisplay : [
		{
			"value" :  [
				{"isProtected": "api.threats.action.block_request"},
				{"isProtected" : "api.threats.action.block_ip"},
				{"isProtected" : "api.threats.action.block_user"},				
			],			
			"id": "api.threats.cross_site_scripting"
		},
		{
			"value" :  [
				{"isProtected": "api.threats.action.block_request"},
				{"isProtected" : "api.threats.action.block_ip"},
				{"isProtected" : "api.threats.action.block_user"},				
			],
			"id": "api.threats.sql_injection",
		},
		{
			"value" :  [
				{"isProtected": "api.threats.action.block_request"},
				{"isProtected" : "api.threats.action.block_ip"},
				{"isProtected" : "api.threats.action.block_user"},				
			],
			"id": "api.threats.cross_site_scripting",
		},
		{
			"value" :  [
				{"isProtected": "api.threats.action.block_request"},
				{"isProtected" : "api.threats.action.block_ip"},
				{"isProtected" : "api.threats.action.block_user"},				
			],
			"id": "api.threats.illegal_resource_access",
		},
		{
			"value" :  [
				{"isProtected" : "api.threats.action.quarantine_url"},				
			],
			"id": "api.threats.backdoor",
		},
		{
			"value" :  [
				{"isProtected": "api.threats.action.block_request"},
				{"isProtected" : "api.threats.action.block_ip"},
				{"isProtected" : "api.threats.action.block_user"},				
			],
			"id": "api.threats.remote_file_inclusion",
		},
		//ddos is a special case since it uses activation_mode instead of policy.action
		{
				"value" :  [
					{"isProtected": "api.threats.ddos.activation_mode.on"},
					{"isProtected": "api.threats.ddos.activation_mode.auto"},
				],
				"id": "api.threats.ddos",
		},
		// Bots is special since it has differet values that need to be used
		{
			"block_bad_bots": true,
			"challenge_suspected_bots": true,
			"id": "api.threats.bot_access_control",
		}
	],

	defaultProtectionDisplayPolicy: {"value" : [{"isProtected" : "api.threats.action.block_request"}], "id": "defaultProtection_id"}, //This is used if specific action was not set in protectionDisplay


	printDebugInfo: false,
	numConcurrentConnections: 15, //Number of concurrent open API sessions

	/*After this time the connection request will timeout. Note that if the number is too low it may cause timeout before server actually responds 
		which implies server is protected */
	originServerConnectionTimeout: 10000, //(In milliseconds)

//Internal usage	
	version: "2.4",
	pageSize: 100, 
    originServerReqSize: 50 //Used for number of parallel requests to origin servers (due to limit of operating system)
});

	

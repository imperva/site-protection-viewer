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

// Advanced configuration

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
	pageSize: 100 //Internal usage

});

	

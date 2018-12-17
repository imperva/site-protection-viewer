module.exports = Object.freeze({
//Configuration
	accountId: "", //  Your account ID - Mandatory
	apiId: "", // Your api id - Mandatory
	apiKey: "",  // Your api key - Mandatory
	checkOriginServers: true, // When set to true, origin servers protection will be validated, this may take a longer time

	title: "", //When empty string it will use the account name as defined in MY

//File
	fileName: "", // When empty string it will use the account name as defined in MY
	filePath: "", // Path where files should be saved, path must be previously created. Format must be as this example if you want to save in data directory in the current installed folder - ./data/
	addTimestamp: false, // Set to true if you want timestamp appended to the filename
	saveCsv: true, // Set to true if you want csv files as well as the html file

// Advanced configuration
	pageSize: 100,
	printDebugInfo: false
});

	

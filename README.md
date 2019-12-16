# (SPV) site-protection-viewer
This **nodejs** tool will provide the user with a simple way to see the current security configuration of the websites protected by our Cloud WAF (Incapsula). It provides a centralized view of all the account website security configuration and also checks whether the sites origin servers are not restricted to receive traffic only from Incapsula as described [here](https://support.incapsula.com/hc/en-us/articles/200627570-Restricting-direct-access-to-your-website-Incapsula-s-IP-addresses-). The tool uses the [Incapsula API](https://docs.incapsula.com/Content/API/api.htm) to get the relevant site information and http/https calls to check the origin servers accessibility.
The output is an html file and (if configured) csv files. 
For more infomation please refer to this [blog](https://www.imperva.com/blog/enhance-imperva-cloud-waf-with-a-new-management-tool-in-the-imperva-github/).
The tool can be used with it's default settings or if needed, user may change the behavior by changing the values in the settings file as described in the configuration section of this page.

# Usage
## Installation
1. Install [nodejs](https://nodejs.org/en/download/) 
2. Download the project files from the github repository and save them locally in a directory of your choice (aka project directory).
3. In the project directory open a command prompt and run 'npm install'
## Configuration
4. In setting.js set the following:
   - **accountId** (mandatory)- your account ID
   - **apiId** (mandatory)- your API ID which you can generate as described in the [API Key Management](https://docs.incapsula.com/Content/management-console-and-settings/api-keys.htm) page
   - **apiKey** (mandatory) - Your API_KEY which you can generate as described in the [API Key Management](https://docs.incapsula.com/Content/management-console-and-settings/api-keys.htm) page
   - **checkOriginServers** (default true)- *true* if you want to check origin server access, running of the tool will take longer, depending on number of origin servers; *false* if you don't
   - **getSubAccountsInfo** (default true)- *true* if you want to get sub account names, running of the tool will take longer, depending on number of origin servers; *false* if you don't
   - **getAttackAnalyticsInfo** (default true)- *true* When set to true Attack Analytics info is also displayed if licensed. This may take a longer time. When set to true, getSubAccountsInfo must also be true
   - **showFullDetails** (default false) - *true* - provides a table per website with detailed information
   - **useLegacyDisplay** (default false) - *true* html display will be as was before version 2 of the tool
   - **title** (default name of account) - the title of the web page
   - **fileName** (default name of account) - the filename
   - **filePath** (default project directory)- Where the files will be saved. Directory must be created prior to running the tool
   - **addTimestamp** (default false) - *true* if you want to have the timestamp attached to the filenames. Without this each time the tool is run the output files will be overridden
   - **saveCsv** (default true) - *true* if you want a csv file as well as an html file
   - **originServerFileNamePrefix** (default 'Origin-servers') - String used as prefix for origin server csv file
   - **attackAnalyticsFileNamePrefix** (default 'Attack-Analytics') - String used as prefix for Attack Analytics csv file
   - **originServerProtectedCode** When origin servers are checked, if one of these codes is returned, it implies that the origin server was NOT reached - it is protected
   - **protectionDisplay** - Use these settings to control the display of whether a setting is considered protected or not.
   - **printDebugInfo** - (default false) - *true* to print debug info during execution	
   - **numConcurrentConnections** - (default 15) - Number of concurrent open API sessions
   - **defaultProtectionDisplayPolicy** - This is used if specific action was not set in protectionDisplay
   - **originServerConnectionTimeout** - (default 10000 miliseconds) Timeout for connection request to origin-server. Note that if the number is too low it may cause timeout before server actually responds which implies server is protected
   
## Run tool
5.  In the project directory run the following command in command line: 
- **node version <12** - *node spv*.
- **node version >=12** - *node --http-parser=legacy spv.js* due to issue listed [here](https://github.com/nodejs/node/issues/27711)
6.  Output files can be found in the configured filePath

# Dependancies
- nodejs
- packages
  - aysnc
  - node-datetime
  - request
  - request-promise
  
# Example 
![alt text](https://github.com/imperva/site-protection-viewer/blob/master/images/spv-screenshot.JPG)

# Contributions & Bug reports
## Contribution
- You can create your own branch and add features, fix bugs.
If you have to merge your changes into the master branch, please reach out to me via mail doron.tzur@imperva.com.
- You can also reach out to me with suggestions which I might implement.

## Reporting Bugs
Please open a Git Issue and include as much information as possible. If possible, provide sample code that illustrates the problem you're seeing. If you're seeing a bug only on a specific repository, please provide a link to it if possible.

Please do not open a Git Issue for help, leave it only for bug reports.

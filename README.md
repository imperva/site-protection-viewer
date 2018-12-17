# (SPV) site-protection-viewer
This **nodejs** tool will provide the user with a simple way to see the current security configuration of the websites protected by our Cloud WAF (Incapsula). It provides a centralized view of all the account website security configuration and also checks whether the sites origin servers can be accessed directly. It uses the [Incapsula API](https://docs.incapsula.com/Content/API/api.htm).
The output is an html file and (if configured) a csv file.


# Usage
## Installtion
1. Install [nodejs](https://nodejs.org/en/download/)
2. Clone spv files to a directory of your choice
3. In the install directory open a command prompt and run 'npm install'
## Configuration
4. In setting.js set the following:
   - **accountId** (mandatory)- your account ID
   - **apiId** (mandatory)- your API ID which you can generate as described in the [API Key Management](https://docs.incapsula.com/Content/management-console-and-settings/api-keys.htm) page
   - **apiKey** (mandatory) - Your API_KEY which you can generate as described in the [API Key Management](https://docs.incapsula.com/Content/management-console-and-settings/api-keys.htm) page
   - **checkOriginServers** (default true)- *true* if you want to check origin server access, running of the tool will take longer, depending on number of origin servers; *false* if you don't
   - **title** (default name of account) - the title of the web page
   - **fileName** (default name of account) - the filename
   - **filePath** (default installation directory)- Where the files will be saved. Directory must be created prior to running the tool
   - **addTimestamp** (default false) - *true* if you want to have the timestamp attached to the filenames. Without this each time the tool is run the output files will be overridden
   - **saveCsv** (default true) - *true* if you want a csv file as well as an html file
## Run tool
5.  In the install directory run command: 'node spv'
6.  Output files can be found in the configured filePath

# Dependancies
- nodejs
- packages
  - aysnc
  - node-datetime
  - requst
  - request-promise
  
# Contributions & Bug reports
## Contribution
- You can create your own branch and add features, fix bugs.
If you have to merge your changes into the master branch, please reach out to me via mail doron.tzur@imperva.com.
- You can also reach out to me with suggestions which I might implement.

## Reporting Bugs
Please open a Git Issue and include as much information as possible. If possible, provide sample code that illustrates the problem you're seeing. If you're seeing a bug only on a specific repository, please provide a link to it if possible.

Please do not open a Git Issue for help, leave it only for bug reports.

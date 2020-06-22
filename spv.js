var https = require('https');
var querystring = require('querystring');
var fs = require('fs')
var async = require('async');
var dateTime = require('node-datetime');
var settings = require('./settings.js');

var checkOrigin = require("./checkOriginReached");
var getAccountSub = require("./getAccountSub");
var getAaInfo = require("./getAttackAnalyticsInfo");
var utils = require("./utils");

var uprotectedSitesInfo = [];
var siteSummaryObject = [];
var subAccountIds = [];
var subAccountsOutput = [];
var aASubAccountOutput = [];
//Used for display purposes
var prevAccountName = '';

var fileName;
var pageSize = 100;
var timeNow = dateTime.create();



//This information is used for calling different APIs
var genericPostData = {
  api_id: settings.apiId,
  api_key: settings.apiKey,
  page_size: settings.pageSize,
  page_num: 0
};

/**/ 
 var appVersion = "2.1";
 var requiredSettingsVersion = 2.1;
/**/

//Colored html status
var htmlVStr = '<td align="center" style="background-color:green;color:white;">V</td>';
var htmlXStr = '<td align="center" style="background-color:red;color:white;">X</td>';
var htmlYStr = '<td align="center" style="background-color:green;color:white;">Y</td>';
var htmlNStr = '<td align="center" style="background-color:red;color:white;">N</td>';
var htmlYesStr = '<td align="left" style="background-color:green;color:white;">Yes</td>';
var htmlNoStr = '<td align="left"style="background-color:red;color:white;">No</td>';


if (settings.useLegacyDisplay)
{
  htmlVStr = '<td align="left" style="color:green">V</td>';
  htmlXStr = '<td align="left "style="color:red">X</td>';
  htmlYStr = '<td align="left" style="color:green">Y</td>';
  htmlNStr = '<td align="left" style="color:red">N</td>';
  htmlYesStr = '<td align="left" style="color:green">Yes</td>';
  htmlNoStr = '<td align="left" style="color:red">No</td>';
}  


var statusOkString = 'fully-configured';

//Default customer if missing or wrong input
var accountId = settings.accountId;
var theTitle = settings.title;
var theFile = settings.fileName;
var checkOriginServers = settings.checkOriginServers;
var getSubAccountsInfo = settings.getSubAccountsInfo;
var getAttackAnalyticsInfo = settings.getAttackAnalyticsInfo;


var validData = true;
if (accountId == "")
{
  console.log("Missing Account ID")
  validData = false;
}
if (genericPostData.api_id == "")
{
  console.log("Missing API ID")
  validData = false;
}
if (genericPostData.api_key == "")
{
  console.log("Missing API key")
  validData = false;
}

if (validData == false)
{
  console.log("Stopped!")
  return;
}


var fullPage = {sites: []};

console.log("site-protection-viewer version: " + appVersion);
if (requiredSettingsVersion != settings.version)
{
  console.log("Aborting - Required settings version is " + requiredSettingsVersion + " wherease actual settings version is "+ settings.version);
  process.exit();
}

if (getAttackAnalyticsInfo == true && getSubAccountsInfo != true)
{
  console.log("Aborting - When getAttackAnalyticsInfo is set to 'true', getSubAccountsInfo must also be set to 'true'");
  process.exit();
}
console.log("Start generating report");
if (checkOriginServers)
  console.log("Note that checkOriginServers = true. This means that total run time will be longer")
if (getSubAccountsInfo)
  console.log("Note that getSubAccountsInfo = true. This means that total run time will be longer")
if (getAttackAnalyticsInfo)
  console.log("Note that getAttackAnalyticsInfo = true. This means that total run time will be longer")

//First function called
getAllData(genericPostData, accountId, 0);

function getAllData(commonPostData, accountId, pageNum)
{
  var postData = {};
  postData.api_id = commonPostData.api_id;
  postData.api_key = commonPostData.api_key;
  postData.page_num = pageNum;
  postData.account_id = accountId;
  postData.page_size = pageSize;

  if(settings.printDebugInfo)
    console.time("Full run time")
  // form data
    postData = querystring.stringify(postData);

    var options = {
        host: 'my.incapsula.com',
        port: 443,
        method: 'POST',
        path: '/api/prov/v1/sites/list',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length
        }
      };
      
    var req = https.request(options, function (res) {
    var result = '';
    res.on('data', function (chunk) {
        result += chunk;
    });
    res.on('end', function () {
      if(settings.printDebugInfo)
        console.timeEnd("get page " + pageNum)
        var jResult = JSON.parse(result);
        if (jResult.res != 0)
        {
          console.log("Error retreiving information - " + jResult.res_message);
          return;
        }

        //Append results
        if(settings.printDebugInfo)
          console.log("pageNum: " + pageNum + " NumSites: " + jResult.sites.length)

        if (jResult.sites.length > 0)
        {
          fullPage.sites.push.apply(fullPage.sites, jResult.sites);
        }
        //If all data has been retrieved, continue
        if (jResult.sites.length < pageSize)
        {
          buildHtmlReport(commonPostData, fullPage);
        }
        else //Retrieve next batch
        {
            pageNum++;
            getAllData(commonPostData, accountId, pageNum);
        }
    });
    res.on('error', function (err) {
        console.log(err);
    });
  });

    // req error
    req.on('error', function (err) {
      console.log("could not get information - check if your credentials and/or account ID are valid")
      console.log(err);
      });
  
    //send request with the postData form
    if(settings.printDebugInfo)
        console.time("get page " + pageNum)
      req.write(postData);
      req.end();
}
  

function buildHtmlReport(commonPostData, siteData)
{
  var output = [];
  var policyOutput = [];
  var originsData = [];

  for (var i = 0; i < siteData.sites.length; i++)
  {
    // Setting data for all sites to check origin server protection for http and https
    for (var j=0; j <  siteData.sites[i].ips.length; j++)
    {
      originsData.push({'subAccountId':siteData.sites[i].account_id, 'siteId':  siteData.sites[i].site_id, 'Name':  siteData.sites[i].domain, 'Protocol': 'https', 'serverName': siteData.sites[i].ips[j]});
      originsData.push({'subAccountId':siteData.sites[i].account_id, 'siteId':  siteData.sites[i].site_id,'Name':  siteData.sites[i].domain, 'Protocol': 'http', 'serverName': siteData.sites[i].ips[j]});
    }

    addSubAccountIdId(siteData.sites[i].account_id)
  }
  // Async call to get all relevant info from different sources  
  getSitesInfo(commonPostData, siteData, originsData);
}


function getSitesInfo(commonPostData, siteData, originsData, informCaller)
{
  var origServerStatusOutpt = {originServers: []};
  var mainAccountInfo = [];
  if(settings.printDebugInfo)
    console.time("Get Site Info time")
  async.parallel(
    [ 
      function(callback) {
        //Get main account info
        getAccountSub.getAccountSubInfo(commonPostData, accountId, mainAccountInfo, callback);
      },
      function(callback) {
        //Get origin server info
        if (checkOriginServers)
          checkOrigin.getOriginServerInfo(originsData, origServerStatusOutpt.originServers, callback);
        else
          callback();
      },
      function(callback) {
        //Get sub account info
        if (getSubAccountsInfo)
          getAccountSub.getAccountSubInfoList(commonPostData, subAccountIds, subAccountsOutput, callback);
        else
          callback();
      },
      function(callback) {
        //Get Attack Analytics Info
        if (getAttackAnalyticsInfo)
          getAaInfo.getAAInfoList(timeNow, commonPostData, subAccountIds, aASubAccountOutput, callback);
        else
          callback();
      },
    ], 
    function done(err, results) {
      if (err) {
        console.log("getSitesStats error")
      }
      
      if(settings.printDebugInfo)
        console.timeEnd("Get Site Info time");
      buildHtml(siteData, origServerStatusOutpt, mainAccountInfo, subAccountsOutput, aASubAccountOutput);
    }
  );
}  

function buildHtmlSummaryTable(isWebVolDDosPurchased)
{
  var output = '<h2><a name="AccountProtectionSettings">Protection Settings</a></h2>\n';
  var statusString;
  var hasTrafficString;
  statusString = "Fully Configured";
  hasTrafficString = '';

  var settingsSummary = {"totalSites": 0, "origNotProtected": 0, "totalNotProtected": 0, "totalNotConfigured": 0};
  
  var tableOutput = '<table>\n';
  tableOutput += '<tr>';


  if (getSubAccountsInfo)
    tableOutput += '<th align="left">Account</th>';
    
  tableOutput += '<th align="left">Site</th><th align="left">' + statusString + hasTrafficString + '<th align="left">Block Bad Bots</th><th align="left">Challenge Suspected Bots</th><th align="left">Backdoor Protection</th>' +
    '<th align="left">Remote File Inclusion</th><th align="left">SQL Injection</th><th align="left">Cross Site Scripting</th><th align="left">Ilegal Resource Access</th>' +
    '<th align="left">DDoS Activity</th><th align="left">Volumetric DDoS</th>';
    
  //If checking orig servers
  if (checkOriginServers)
    tableOutput += '<th align="left">Origin Server Protected</th></tr>\n';
  else
    tableOutput += '</tr>\n';

  for (var i = 0; i < siteSummaryObject.length; i++)
  {
    tableOutput += buildHtmlSumRow(siteSummaryObject[i], settingsSummary);
  }

  tableOutput += '</table>';

  output += '<p><b>Number of fully configured sites: </b>' + (settingsSummary.totalSites - settingsSummary.totalNotConfigured) + 
    ' out of ' + settingsSummary.totalSites + '</p>\n';

  output += '<p><b>Number of fully protected sites: </b>' + (settingsSummary.totalSites - settingsSummary.totalNotConfigured - settingsSummary.totalNotProtected) + 
  ' out of ' + (settingsSummary.totalSites - settingsSummary.totalNotConfigured) + '</p>\n';

  if (checkOriginServers)
  {
    output += '<p><b>Number of sites with protected origin-server:</b> ' + (settingsSummary.totalSites - settingsSummary.totalNotConfigured - settingsSummary.origNotProtected) + 
    ' out of ' + (settingsSummary.totalSites - settingsSummary.totalNotConfigured) + '</p>\n'; 
  }
  else
  {
    output += '<p><b>Origin servers were not checked and their status not taken into account! </b></p>\n';
  }


  output += tableOutput;

  return (output);
}


function buildHtmlSumRow(siteSummaryObject, settingsSummary)
{
  var output;
  var dispalyAccountName = "";
  var wafConfigUrl = 'https://my.incapsula.com/sites/settings?isolated=true&accountId=' + siteSummaryObject.accountId + '&extSiteId=' + siteSummaryObject.siteId + '&fragment=section%3Dsettings_section_threats#section=settings&settings_section=settings_section_threats';
  var accountUrl = 'https://my.incapsula.com/sites?accountId=' + siteSummaryObject.accountId;
  var isFullyProtected = true;
  var isFullyConfigured = true;
  var isFullyConfigured = true;
  var isOriginProtected = true;
  
  settingsSummary.totalSites++;

  output = '<tr>' 
  if (getSubAccountsInfo)
  {
    if (prevAccountName != siteSummaryObject.accountName)
    {
      dispalyAccountName = '<a href="' + accountUrl + '">' + siteSummaryObject.accountName + '</a>'
      prevAccountName = siteSummaryObject.accountName;
    }
    output += '<td align="left">' + dispalyAccountName + '</td>'; 
  } 
  
  output += '<td align="left"><a href="' + wafConfigUrl + '">' + siteSummaryObject.site + '</a></td>';    

  //Fully configured
  if (siteSummaryObject.status == statusOkString)
    output += htmlYStr;
  else 
  {
    isFullyConfigured = false;
    output += htmlNStr;
  }
     

  if (siteSummaryObject.blockBadBots == 'Y')
    output += htmlVStr;
  else
  {
    isFullyProtected = false;
    output += htmlNStr;
  }

  if (siteSummaryObject.challengeSuspected == 'Y')
    output += htmlVStr;
  else
  {
    isFullyProtected = false;
    output += htmlNStr;
  }

  if (siteSummaryObject.backDoorProtection == 'Y')
    output += htmlVStr;
  else
  {
    isFullyProtected = false;
    output += htmlNStr;
  }

  if (siteSummaryObject.remoteFileInclusion == 'Y')
    output += htmlVStr;
  else
  {
    isFullyProtected = false;
    output += htmlNStr;
  }

  if (siteSummaryObject.sqlInjection == 'Y')
    output += htmlVStr;
  else
  {
    isFullyProtected = false;
    output += htmlNStr;
  }

    if (siteSummaryObject.crossSiteScripting == 'Y')
    output += htmlVStr;
  else
  {
    isFullyProtected = false;
    output += htmlNStr;
  }

  if (siteSummaryObject.illegalResourceAccess == 'Y')
    output += htmlVStr;
  else
  {
    isFullyProtected = false;
    output += htmlNStr;
  }

  if (siteSummaryObject.ddosActivityMode == 'Y')
    output += htmlVStr;
  else
  {
    isFullyProtected = false;
    output += htmlNStr;
  }

  if (siteSummaryObject.isWebVolDDosPurchased == 'Y')
    output += htmlVStr;
  else
    output += htmlXStr;

  if (checkOriginServers)
  {
    if (siteSummaryObject.origServerProtected == 'Y')
      output += htmlVStr;
    else
    {
      isFullyProtected = false;
      output += htmlNStr;
      isOriginProtected = false;
    }
  }

  if (isFullyConfigured == false)
      settingsSummary.totalNotConfigured++;
  else
  { //Total not protected only relevant if site is fully configured
    if (isFullyProtected == false)
      settingsSummary.totalNotProtected += 1;
    if (isOriginProtected == false)
      settingsSummary.origNotProtected += 1;
  }
  output += '</tr>\n';
  
  return (output);
}

function setHasTrafficInHtmlSummaryTable(domain, hasTraffic)
{
  for (var i=0; i < siteSummaryObject.length; i++)
  {
    if (siteSummaryObject[i].site == domain)
    {
      if (hasTraffic == false)
        siteSummaryObject[i].hasTraffic = "N";
      else 
        siteSummaryObject[i].hasTraffic = "Y";
      break;
    }
  }

}

function buildHtml(siteData, originServersInfo, mainAccountInfo, subAccountsOutput, aASubAccountOutput)
{
  if(settings.printDebugInfo)
    console.time("buildHtml end")
  var output = [];
  var sitesOutput = [];
  
  if(theTitle == "")
    theTitle = mainAccountInfo[0].accountName;

  output += '<html> <script src="https://code.jquery.com/jquery-3.1.0.js"></script>\n';
  output += '<head> <style> tr:nth-child(even) {background: #CCC}</style> </head>\n';
  output += '<title>' + theTitle + ' - Report </title>\n'
  output += '<style> table, th, td {border: 1px solid black; border-collapse: collapse;} .redText { color:red; } .blackText { color:black; } .greenText { color:green; } .brownText { color:brown; } .orangeText { color:orange; }</style>\n'
  output += '<body>\n';
  output += '<h1>' + theTitle + ' - (Account ID ' + accountId + ') - ' + timeNow.format('d-f-Y H:M:S') + '</h1>\n'

  output += '<p><b> Number of sites : ' + siteData.sites.length + '</b><\p>\n';
  if (getAttackAnalyticsInfo)
    output += '<a href="#AccountIncidentsSummary">Incidents Summary<\a><br>\n';
  output += '<a href="#AccountProtectionSettings">Protection Settings<\a><br>\n';
  if (checkOriginServers)
    output += '<a href="#OriginServers">Origin Servers<\a><br>\n';
  if (settings.showFullDetails)    
    output += '<a href="#FullDetails">Full Details<\a><br>\n';
  
  
  
  if (getAttackAnalyticsInfo)
  {
    //buildAaInfo(mainAccountInfo)
    output += getAaInfo.buildAaReport(mainAccountInfo[0].isAttackAnalyticsPurchased, aASubAccountOutput, mainAccountInfo, subAccountsOutput);
  }

  if (getSubAccountsInfo)
  {
    /*Add sub account name, actually set into 2 one for sorting and one for actual display. 
      The reason is that we want the root account to be the first */
    for (var i = 0; i < siteData.sites.length; i++)
    {
      siteData.sites[i]['sortByAccountName'] = getAccountName(siteData.sites[i].account_id, subAccountsOutput, mainAccountInfo[0].accountId)
      if (siteData.sites[i]['sortByAccountName'] == "")
        siteData.sites[i]['accountName'] = "Root";
      else 
        siteData.sites[i]['accountName'] = siteData.sites[i]['sortByAccountName'];
    }

    siteData.sites.sort(function (a,b) {
      if ((a.sortByAccountName < b.sortByAccountName) || 
          (a.sortByAccountName == b.sortByAccountName) && (a.domain < b.domain))
          return (-1);
      if ((a.sortByAccountName > b.sortByAccountName) || 
          (a.sortByAccountName == b.sortByAccountName) && (a.domain > b.domain))
          return (1);  
      });
  }
  else
  {
    siteData.sites.sort(function (a,b) {
      if (a.domain < b.domain)
          return (-1);
      if (a.domain > b.domain)
          return (1);  
      });    
  }
  
  for (var i = 0; i < siteData.sites.length; i++)
  {
    var site = siteData.sites[i];
    var policyOutput = [];
    var origServerOutput = [];
  
    policyOutput =  buildPolicyReport(site, mainAccountInfo[0].isWebVolDDosPurchased);

    if (checkOriginServers)
    {
      origServerOutput = checkOrigin.buildOriginServersReport(site.domain, originServersInfo, siteSummaryObject);
    }

    sitesOutput += '<h3 style="color:brown" id="' + site.domain + '">' + site.domain + '</h3>\n';
    
    
    sitesOutput += '<table border="1" cellspacing="20">';
    sitesOutput += '<td align="left" style = "vertical-align: top;">' + policyOutput + '</td><td align="left" style = "vertical-align: top;"  >' +  origServerOutput + '</td>\n';

    sitesOutput += '</table>\n'
  }

  output += buildHtmlSummaryTable(mainAccountInfo[0].isWebVolDDosPurchased);
  if (checkOriginServers)
  {
    output += checkOrigin.buildOriginServerSummary(originServersInfo, mainAccountInfo, subAccountsOutput)
  }
  
  if (settings.showFullDetails)
  {
    output += '<h2><a name="FullDetails">Full Details</a></h2>\n';
    output += sitesOutput;
  }

  output += '</body></html>\n'
 
  if(settings.printDebugInfo)
    console.timeEnd("buildHtml end")

  if (theFile == "")
    theFile = mainAccountInfo[0].accountName;

  fileName = settings.filePath + theFile;
  if (settings.addTimestamp)
    fileName += '-' + (timeNow.format('Y-m-d-H_M_S'));


  // Save to file
  utils.saveToFile(fileName + '.html', output);

  if (settings.saveCsv)
    createCsv(originServersInfo, mainAccountInfo, aASubAccountOutput);

 if(settings.printDebugInfo)
    console.timeEnd("Full run time")
}

function createCsv(originServersInfo, mainAccountInfo, aASubAccountOutput)
{
  console.log('\n');
  createSitesCsv();
  
  if (checkOriginServers)
    checkOrigin.createOriginServerCsv(fileName, originServersInfo)

  if (checkOriginServers)
    checkOrigin.createOriginServerCsv(fileName, originServersInfo, mainAccountInfo, subAccountsOutput)
    
  if (getAttackAnalyticsInfo)
    getAaInfo.createAaCsv(mainAccountInfo[0].isAttackAnalyticsPurchased, fileName, aASubAccountOutput)  
}



function createSitesCsv()
{
  var csvFileOutput = 'Index,';
  if (getSubAccountsInfo)
      csvFileOutput += 'Account,';

  csvFileOutput += 'Site,Is Fully Configured,';
  csvFileOutput += 'Block bad bots,Challenge Suspected,Backdoor Protection,Remote file inclusion,SQL injection,Cross Site Scripting,Ilegal Resource Access,DDoS Activity Mode,Volumetric DDoS';

  if (checkOriginServers)
    csvFileOutput += ',Origin Servers Protected';
  
  csvFileOutput +=  ',Account ID, Site ID\r\n';

  for (var i = 0; i < siteSummaryObject.length; i++)
  {
    var statusVal = 'N';
    if (siteSummaryObject[i].status == statusOkString)
      statusVal = 'Y';
    csvFileOutput += (i+1) + ',';

    if (getSubAccountsInfo)
      csvFileOutput += siteSummaryObject[i].accountName + ',';
    
    csvFileOutput += siteSummaryObject[i].site + ',' +  statusVal + ',' + siteSummaryObject[i].blockBadBots + ',' + siteSummaryObject[i].challengeSuspected + ',' + 
      siteSummaryObject[i].backDoorProtection + ',' +  siteSummaryObject[i].remoteFileInclusion + ',' + 
      siteSummaryObject[i].sqlInjection + ',' + siteSummaryObject[i].crossSiteScripting + ',' + 
      siteSummaryObject[i].illegalResourceAccess + ',' + siteSummaryObject[i].ddosActivityMode + ',' + 
      siteSummaryObject[i].isWebVolDDosPurchased + ',';

    if (checkOriginServers)
      csvFileOutput += siteSummaryObject[i].origServerProtected + ',';

    csvFileOutput += siteSummaryObject[i].accountId + ',' + siteSummaryObject[i].siteId + '\r\n';
  
  }

  utils.saveToFile(fileName + '.csv', csvFileOutput);
}

function getHtmlDisplayCellString(theString, colorName)
{
  var output;

  if (settings.useLegacyDisplay)
    output = '<td align="left" style="color:' + colorName + '">' + theString + '</td>';
  else
    output =  '<td align="left" style="background-color:' + colorName + ';color:white;">'+ theString + '</td>';

  return (output);
}


function buildPolicyReport(site, isWebVolDDosPurchased)
{
  var siteSummary = {"accountName": "", "site": "", "siteId": "", "accountId": "", "status": "", "hasTraffic": "", "blockBadBots": "Y",
  "challengeSuspected": "Y", "backDoorProtection": "Y", "remoteFileInclusion" : "Y" ,"sqlInjection": "Y" ,"crossSiteScripting": "Y",
  "illegalResourceAccess": "Y", "ddosActivityMode": "Y", "isWebVolDDosPurchased": "Y", "origServerProtected": "Y"};

  var policyOutput = '<h3>Security Policies</h3>\n' 
  policyOutput += '<table border="1">\n';
  policyOutput += '<tr><th align="left">Policy</th> <th align="left">Current Setting</th> </tr>\n';

  if (getSubAccountsInfo)
    siteSummary.accountName = site.accountName;

  siteSummary.site = site.domain;
  siteSummary.siteId = site.site_id;
  siteSummary.accountId = site.account_id;
  siteSummary.status = site.status;

  var fullyConfiguredStr = htmlNoStr;
  if (siteSummary.status == statusOkString)
      fullyConfiguredStr = htmlYesStr;
  policyOutput += '<tr><td align="left">Fully configured</td>' + fullyConfiguredStr + '</tr>\n';

  for (var k=0; k<site.security.waf.rules.length; k++)
  {
    var ddosProtected = false;
    var isProteced = false;
    var policy = site.security.waf.rules[k]; 

    if (policy == null)
      continue;

    if (policy.id === 'api.threats.ddos') //Special case using activation_mode
    {
      ddosProtected = utils.isProtected(policy.id, policy.activation_mode);
      if (!ddosProtected)
      {

        policyOutput += '<tr><td align="left" style="color:black"> DDoS Activity </td>' + getHtmlDisplayCellString(policy.activation_mode_text, "red") + '</tr>\n'; 
        setSecurityIssue(site.domain, "policy", policy.name, policy.activation_mode_text);

        siteSummary.ddosActivityMode = "N";
      }
      else
        policyOutput += '<tr><td align="left" style="color:black"> DDoS Activity </td>' + getHtmlDisplayCellString(policy.activation_mode_text, "green") + '</tr>\n'; 
    }
    else if (policy.id === 'api.threats.bot_access_control') //Special case using different parameters
    {
      var displayPolicy = utils.getDisplayPolicy(policy.id);
      if ((policy.id != displayPolicy.id) || (policy.block_bad_bots != displayPolicy.block_bad_bots)) //If returned policy id is not the same (meaning default was returned), act as not protected, this is just a precaution if settings file is corrupt
      {
        policyOutput += '<tr><td align="left" style:="color:black">Bot Access Control</td>' + getHtmlDisplayCellString("ignore", "red") +  '</tr>\n';
        setSecurityIssue(site.domain, "policy", "Bot Access Control", policy.block_bad_bots);
      
        siteSummary.blockBadBots = "N";
      }
      else
        policyOutput += '<tr><td align="left" style:="color:black">Bot Access Control</td>' + getHtmlDisplayCellString("Block Request", "green") +  '</tr>\n';

      //Special case as there is no text in the response.
      if (policy.challenge_suspected_bots == true)
        policyOutput += '<tr><td align="left" style:="color:black">Challenge Suspected Bots</td>' + getHtmlDisplayCellString("Captcha Challenge", "orange") +  '</tr>\n';
      else
        policyOutput += '<tr><td align="left" style:="color:black">Challenge Suspected Bots</td>' + getHtmlDisplayCellString("Ignore", "orange") +  '</tr>\n';
    }
    else if (policy.id === "api.threats.customRule")
    {
      //Ignore IncapRules
    }
    else
    {
      isProtected = utils.isProtected(policy.id, policy.action);
      if (!isProtected)
      {
        
        policyOutput += '<tr><td align="left" style:="color:black">' + policy.name + '</td>' + getHtmlDisplayCellString(policy.action_text, "red") +  '</tr>\n';
        setSecurityIssue(site.domain.name, "policy", policy.name,  policy.action_text);
        
        if (policy.id === "api.threats.sql_injection")
          siteSummary.sqlInjection = "N";
        else if (policy.id === "api.threats.cross_site_scripting")
          siteSummary.crossSiteScripting = "N";
        else if (policy.id === "api.threats.illegal_resource_access")
          siteSummary.illegalResourceAccess = "N";
        else if (policy.id === "api.threats.backdoor")
          siteSummary.backDoorProtection = "N";
        else if (policy.id === "api.threats.remote_file_inclusion")
          siteSummary.remoteFileInclusion = "N";
      }
      else
        policyOutput += '<tr><td align="left" style:="color:black">' + policy.name + '</td>' + getHtmlDisplayCellString(policy.action_text, "green") +  '</tr>\n';
    }

  }
  if (!isWebVolDDosPurchased)
  {
    policyOutput += '<tr><td align="left" style:="color:black">Volumetric DDoS</td>' + getHtmlDisplayCellString("Not Protected", "red") + '</tr>\n';
    siteSummary.isWebVolDDosPurchased = "N";
  }
  else
    policyOutput += '<tr><td align="left" style:="color:black">Volumetric DDoS</td>' + getHtmlDisplayCellString("Protected", "green") + '</tr>\n';
    
  policyOutput += '</table>';

  //Set in global summary struct
  siteSummaryObject.push(siteSummary)

  return (policyOutput);  
}

function setSecurityIssue(domain, type, subject, reason)
{
	var notFound = true;	
	for (var i=0; i<uprotectedSitesInfo.length; i++)
	{
		if (uprotectedSitesInfo[i].domain == domain)
		{
      if (type == "originServer")
        uprotectedSitesInfo[i].numOriginServers++;
      else
        uprotectedSitesInfo[i].numPolicies++;

      uprotectedSitesInfo[i].issues.push({"subject": subject, "reason": reason})

      notFound = false;
			break;
		}
	}
  if (notFound)
  {
    if (type == "originServer")
      uprotectedSitesInfo.push({"domain": domain, "numPolicies": 0, "numOriginServers": 1, "issues":[{"subject": subject, "reason": reason}]})
    else
      uprotectedSitesInfo.push({"domain": domain, "numPolicies": 1, "numOriginServers": 0, "issues":[{"subject": subject, "reason": reason}]})
    
  }
}

//Sub account related functionality
function addSubAccountIdId(accountId)
{
	var notFound = true;	
	for (var i=0; i<subAccountIds.length; i++)
	{
		if (subAccountIds[i].accountId == accountId)
		{
      notFound = false;
			break;
		}
	}
  if (notFound)
  {
    subAccountIds.push({"accountId": accountId})    
  }
}

function getAccountName(accountId, subAccountsOutput, mainAccountId)
{
  var name = "undefined";

  if (accountId == mainAccountId)
    name = "";
  else
  {
    for (var i=0; i<subAccountsOutput.length; i++)
    {
      if (subAccountsOutput[i].accountId == accountId)
      {
        name = subAccountsOutput[i].accountName
        break;
      }
    }
  }  
  return name;
}

function enrichArrayElementsWithSubAccount(arrayInfo, mainAccountInfo, subAccountsOutput)
{
  if (getSubAccountsInfo)
  {
    //Check if already this functionality was already done, If so, do nothing.
    if (arrayInfo[0]['accountName'] != null)
      return;
    //Adding accountName and sortByAccountName
    for (var i = 0; i < arrayInfo.length; i++)
    {
      arrayInfo[i]['sortByAccountName'] = getAccountName(arrayInfo[i].subAccountId, subAccountsOutput, mainAccountInfo[0].accountId)
      if (arrayInfo[i]['sortByAccountName'] == "")
        arrayInfo[i]['accountName'] = "Root";
      else 
        arrayInfo[i]['accountName'] = arrayInfo[i]['sortByAccountName'];
    }
  }
}

module.exports.setSecurityIssue = setSecurityIssue;
module.exports.enrichArrayElementsWithSubAccount = enrichArrayElementsWithSubAccount;





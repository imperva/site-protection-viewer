var https = require('https');
var querystring = require('querystring');
var fs = require('fs')
var async = require('async');
var dateTime = require('node-datetime');
var settings = require('./settings.js');

var checkOrigin = require("./checkOriginReached");
var getAccountSub = require("./getAccountSub");
var utils = require("./utils");

var uprotectedSitesInfo = [];
var siteSummaryObject = [];

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


//Colored html status
var htmlVStr = '<td align="left"><span class="greenText">V</span></td>';
var htmlXStr = '<td align="left"><span class="redText">X</span></td>';
var htmlYesStr = '<td align="left"><span class="greenText">Yes</span></td>';
var htmlNoStr = '<td align="left"><span class="orangeText">No</span></td>';
var statusOkString = 'fully-configured';

//Default customer if missing or wrong input
var accountId = settings.accountId;
var theTitle = settings.title;
var theFile = settings.fileName;
var checkOriginServers = settings.checkOriginServers;


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

console.log("Start generating report");
if (checkOriginServers)
  console.log("Note that checkOriginServers = true. This means that total run time will be longer")

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
    })
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
      originsData.push({'Name':  siteData.sites[i].domain, 'Protocol': 'https', 'serverName': siteData.sites[i].ips[j]});
      originsData.push({'Name':  siteData.sites[i].domain, 'Protocol': 'http', 'serverName': siteData.sites[i].ips[j]});
    }
  }
  // Async call to get all relevant info from different sources
  getSitesInfo(commonPostData, siteData, originsData);
}


function getSitesInfo(commonPostData, siteData, originsData, informCaller)
{
  var origServerStatusOutpt = {originServers: []};
  var accountSubInfoOutput = [];
  if(settings.printDebugInfo)
    console.time("Get Site Info time")
  async.parallel(
    [ 
      function(callback) {
        //Get origin server info
        if (checkOriginServers)
          checkOrigin.checkSiteDataReportPar(originsData, origServerStatusOutpt.originServers, callback);
        else
          callback();
      },
      function(callback) {
        getAccountSub.getAccountSubInfo(commonPostData, accountId, accountSubInfoOutput, callback);
          //callback();
      },
    ], 
    function done(err, results) {
      if (err) {
        console.log("getSitesStats error")
      }
      
      if(settings.printDebugInfo)
        console.timeEnd("Get Site Info time");
  
      buildHtml(siteData, origServerStatusOutpt, accountSubInfoOutput);
    }
  );
}  

function buildHtmlSummaryTable(isWebVolDDosPurchased)
{
  var output = '<h2>Summary</h2>\n';

  output += '<table>\n';
  var statusString;
  var hasTrafficString;
  statusString = "Fully Configured";
  hasTrafficString = '';

  output += '<tr><th align="left">Site</th><th align="left">' + statusString + hasTrafficString + '<th align="left">Block bad bots</th><th align="left">Challenge Suspected</th><th align="left">Backdoor Protection</th>' +
    '<th align="left">Remote file inclusion</th><th align="left">SQL injection</th><th align="left">Cross Site Scripting</th><th align="left">Ilegal Resource Access</th>' +
    '<th align="left">DDoS Activity</th><th align="left">Volumetric DDoS</th>';
    
    
  //If checking orig servers
  if (checkOriginServers)
    output += '<th align="left">Origin Server Protected</th></tr>\n';
  else
    output += '</tr>\n';

  for (var i = 0; i < siteSummaryObject.length; i++)
  {
    output += buildHtmlSumRow(siteSummaryObject[i]);
  }

  output += '</table>';

  return output;
}

function buildHtmlSumRow(siteSummaryObject)
{
  var output;
  var wafConfigUrl = 'https://my.incapsula.com/sites/settings?isolated=true&accountId=' + siteSummaryObject.accountId + '&extSiteId=' + siteSummaryObject.siteId + '&fragment=section%3Dsettings_section_threats#section=settings&settings_section=settings_section_threats';
  
  output = '<tr>' + '<td align="left"><a href="' + wafConfigUrl + '">' + siteSummaryObject.site + '</a></td>'
  if (siteSummaryObject.status == statusOkString)
  {
    output += '<td align="left"><span class="greenText">Y</span></td>';
  }
  else 
  {
     output += '<td align="left"><span class="redText">N</span></td>';
  }
  if (siteSummaryObject.blockBadBots == 'Y')
    output += htmlVStr;
  else
    output += htmlXStr;

  if (siteSummaryObject.challengeSuspected == 'Y')
    output += htmlVStr;
  else
    output += htmlXStr;

  if (siteSummaryObject.backDoorProtection == 'Y')
    output += htmlVStr;
  else
    output += htmlXStr;

  if (siteSummaryObject.remoteFileInclusion == 'Y')
    output += htmlVStr;
  else
    output += htmlXStr;

  if (siteSummaryObject.sqlInjection == 'Y')
    output += htmlVStr;
  else
    output += htmlXStr;

    if (siteSummaryObject.crossSiteScripting == 'Y')
    output += htmlVStr;
  else
    output += htmlXStr;

  if (siteSummaryObject.illegalResourceAccess == 'Y')
    output += htmlVStr;
  else
    output += htmlXStr;

  if (siteSummaryObject.ddosActivityMode == 'Y')
    output += htmlVStr;
  else
    output += htmlXStr;

  if (siteSummaryObject.isWebVolDDosPurchased == 'Y')
    output += htmlVStr;
  else
    output += htmlXStr;



  if (checkOriginServers)
  {
    if (siteSummaryObject.origServerProtected == 'Y')
      output += htmlVStr;
    else
      output += htmlXStr;
  }

  output += '</tr>\n';
  
  return output;
}

function setOrigServerNotProtectedInHtmlSummaryTable(domain)
{
  for (var i=0; i < siteSummaryObject.length; i++)
  {
    if (siteSummaryObject[i].site == domain)
    {
      siteSummaryObject[i].origServerProtected = "N";
      break;
    }
  }
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

function buildHtml(siteData, originServersInfo, accountSubInfo)
{
  if(settings.printDebugInfo)
    console.time("buildHtml end")
  var output = [];
  var sitesOutput = [];
  
  if(theTitle == "")
    theTitle = accountSubInfo[0].accountName;

  output += '<html> <script src="https://code.jquery.com/jquery-3.1.0.js"></script>\n';
  output += '<head> <style> tr:nth-child(even) {background: #CCC}</style> </head>\n';
  output += '<title>' + theTitle + ' - Report </title>\n'
  output += '<style> .redText { color:red; } .blackText { color:black; } .greenText { color:green; } .brownText { color:brown; } .orangeText { color:orange; }</style>\n'
  output += '<body>\n';
  output += '<h1>' + theTitle + ' - (Account ID ' + accountId + ') - ' + timeNow.format('Y-m-d H:M:S') + '</h1>\n'

  output += '<p> Number of sites : ' + siteData.sites.length + '<\p>\n';


  //Sort by site name
  siteData.sites.sort(function (a,b) {
    if (a.domain < b.domain)
        return (-1);
    if (a.domain > b.domain)
        return (1);  
    });
  
  
  for (var i = 0; i < siteData.sites.length; i++)
  {
    var site = siteData.sites[i];
    var policyOutput = [];
    var origServerOutput = [];

    policyOutput =  buildPolicyReport(site, accountSubInfo[0].isWebVolDDosPurchased);

    if (checkOriginServers)
    {
      origServerOutput = buildOriginServersReport(site.domain, originServersInfo);
    }

    sitesOutput += '<h3 id="' + site.domain + '"><span class="brownText">' + site.domain + '</span></h3>\n';
    
    
    sitesOutput += '<table border="1" cellspacing="20">';
    sitesOutput += '<td align="left" style = "vertical-align: top;">' + policyOutput + '</td><td align="left" style = "vertical-align: top;"  >' +  origServerOutput + '</td>\n';

    sitesOutput += '</table>\n'
  }

  output += buildHtmlSummaryTable(accountSubInfo[0].isWebVolDDosPurchased);
  if (checkOriginServers)
    output += buildOriginServerSummary(originServersInfo)

  if (settings.showFullDetails)
  {
    output += '<h2>Full Details</h2>\n';
    output += sitesOutput;
  }

  output += '</body></html>\n'
 
  if(settings.printDebugInfo)
    console.timeEnd("buildHtml end")

  if (theFile == "")
    theFile = accountSubInfo[0].accountName;

  fileName = settings.filePath + theFile;
  if (settings.addTimestamp)
    fileName += '-' + (timeNow.format('Y-m-d-H_M_S'));


  // Save to file
  utils.saveToFile(fileName + '.html', output);

  if (settings.saveCsv)
    createCsv();

 if(settings.printDebugInfo)
    console.timeEnd("Full run time")
}

function createCsv()
{
  var csvFileOutput = 'Index,Site,Is Fully Configured,';
  csvFileOutput += 'Block bad bots,Challenge Suspected,Backdoor Protection,Remote file inclusion,SQL injection,Cross Site Scripting,Ilegal Resource Access,DDoS Activity Mode,Volumetric DDoS';

  if (checkOriginServers)
    csvFileOutput += ',Origin Servers Protected\r\n';
  else
    csvFileOutput += '\r\n';

  for (var i = 0; i < siteSummaryObject.length; i++)
  {
    var statusVal = 'N';
    if (siteSummaryObject[i].status == statusOkString)
      statusVal = 'Y';

    csvFileOutput += i + ',' + siteSummaryObject[i].site + ',' +  statusVal + ',';
    
    csvFileOutput +=siteSummaryObject[i].blockBadBots + ',' + siteSummaryObject[i].challengeSuspected + ',' + 
      siteSummaryObject[i].backDoorProtection + ',' +  siteSummaryObject[i].remoteFileInclusion + ',' + 
      siteSummaryObject[i].sqlInjection + ',' + siteSummaryObject[i].crossSiteScripting + ',' + 
      siteSummaryObject[i].illegalResourceAccess + ',' + siteSummaryObject[i].ddosActivityMode + ',' + 
      siteSummaryObject[i].isWebVolDDosPurchased;

    if (checkOriginServers)
      csvFileOutput += ',' + siteSummaryObject[i].origServerProtected + '\r\n';
    else
      csvFileOutput += '\r\n';
  
  }

  utils.saveToFile(settings.filePath + fileName + '.csv', csvFileOutput);
}


function buildOriginServerSummary(sitesOriginServersInfo)
{
  var originServersOutput = '<h2>Origin Servers</h2>\n';
  var originServerStatusStr;
  var domainStr = "";
  
  //Sort by site name
  sitesOriginServersInfo.originServers.sort(function (a,b) {
    if (a.domain < b.domain)
        return (-1);
    if (a.domain > b.domain)
        return (1);  
    });



  originServersOutput += '<table border="1">\n';
  originServersOutput += '<tr><th align="left">Site</th><th align="left">Origin Server</th><th align="left">Protocol</th><th align="left">Is Protected</th><th  align="left">Reason</th> </tr>\n';
  
  for (var i = 0; i < sitesOriginServersInfo.originServers.length; i++)
  {
    domainStr = '<td align="left" id="' + sitesOriginServersInfo.originServers[i].domain + '">' + sitesOriginServersInfo.originServers[i].domain + '</td>';
      //Sort results by serverName since responses arrive async
      sitesOriginServersInfo.originServers[i].originServers.sort(function (a,b) {
      if (a.domain < b.serverName)
          return (-1);
      if (a.domain > b.serverName)
          return (1);  
      });

    for (var j = 0; j < sitesOriginServersInfo.originServers[i].originServers.length; j++)
    {    
      //In order to write site only once per all origin servers
      if (j != 0)
        domainStr = '<td align="left"></td>';

      if (sitesOriginServersInfo.originServers[i].originServers[j].isProtected == true)
        originServerStatusStr = '<td align="left"><span class="greenText">Yes</span></td></span></td>';
      else 
        originServerStatusStr = '<td align="left"><span class="redText">No</span></td></span></td>';

      originServersOutput += '<tr>' + domainStr + '<td align="left"><span class="blackText">' + sitesOriginServersInfo.originServers[i].originServers[j].serverName + '</span></td>' + '<td align="left"><span class="blackText">' + 
        sitesOriginServersInfo.originServers[i].originServers[j].protocol + '</span></td>' + 
        originServerStatusStr +  '<td align="left"><span class="blackText">' + sitesOriginServersInfo.originServers[i].originServers[j].code + '</span></td></tr>\n';                                                   
    }
  }

  originServersOutput += '</table>\n';
  return originServersOutput;
}

function buildOriginServersReport(domain, sitesOriginServersInfo)
{
  var originServersOutput = '\n<h3>Origin Servers</h3>\n'
  var origServers = null;
  for (var i = 0; i < sitesOriginServersInfo.originServers.length; i++)
  {
    if (sitesOriginServersInfo.originServers[i].domain == domain)
    {
      origServers = sitesOriginServersInfo.originServers[i].originServers;
      break;
    }
  }

  // Origin servers for this domain were found, create report
  if (origServers)
  {
    originServersOutput += '<table border="1">';
    originServersOutput += '<tr><th align="left">Origin Server</th> <th align="left">Protocol</th><th align="left">Is Protected</th><th align="left">Code</th> </tr>\n';
    for (var i = 0; i < origServers.length; i++)
    {
      if (origServers[i].isProtected == true)
        originServersOutput += '<tr><td align="left"><span class="blackText">' + origServers[i].serverName + '</span></td>' +
          '<td align="left"><span class="blackText">' + origServers[i].protocol + '</span></td>' + 
          '<td align="left"><span class="greenText">Yes</span></td></span></td><td align="left">' +
          '<span class="blackText">' + origServers[i].code + '</span></td></tr>\n';
      else
      {
        originServersOutput += '<tr><td align="left"><span class="blackText">' + origServers[i].serverName + '</span></td>' +
          '<td align="left"><span class="blackText">' + origServers[i].protocol + '</span></td>' + 
          '<td align="left"><span class="redText">No</span></td>' +
          '<td align="left"><span class="blackText">' + origServers[i].code + '</span></td></tr>\n';


        //        originServersOutput += '<tr><td align="left"><span class="blackText">' + origServers[i].serverName + '</span></td> <td align="left"><span class="redText">No</span></td></span></td><td align="left"><span class="blackText">' + origServers[i].code + '</span></td></tr>\n';
        setSecurityIssue(domain, "originServer", origServers[i].serverName, "Accessable")
        setOrigServerNotProtectedInHtmlSummaryTable(domain);
      }
    }

    originServersOutput += '</table>';
  }

  return (originServersOutput);
}

function buildPolicyReport(site, isWebVolDDosPurchased)
{
  var siteSummary = {"site": "", "siteId": "", "accountId": "", "status": "", "hasTraffic": "", "blockBadBots": "Y",
  "challengeSuspected": "Y", "backDoorProtection": "Y", "remoteFileInclusion" : "Y" ,"sqlInjection": "Y" ,"crossSiteScripting": "Y",
  "illegalResourceAccess": "Y", "ddosActivityMode": "Y", "isWebVolDDosPurchased": "Y", "origServerProtected": "Y"};

  var policyOutput = '<h3>Security Policies</h3>\n' 
  policyOutput += '<table border="1">\n';
  policyOutput += '<tr><th align="left">Policy</th> <th align="left">Current Setting</th> </tr>\n';

  siteSummary.site = site.domain;
  siteSummary.siteId = site.site_id;
  siteSummary.accountId = site.account_id;
  siteSummary.status = site.status;

  for (var k=0; k<site.security.waf.rules.length; k++)
  {
    var ddosProtected = false;
    var policy = site.security.waf.rules[k]; 
    if (policy == null)
      continue;

    var displayPolicy = utils.getDisplayPolicy(policy.id);
    if (policy.id === 'api.threats.ddos')
    {
      // Special case since there is more than one value that can define 'protected'
      //console.log("policy.activation_mode " + policy.activation_mode + " || displayPolicy.activation_mode " +  displayPolicy.value + " || policy.activation_mode_text " + policy.activation_mode_text)
      for (var i = 0; i < displayPolicy.value.length; i++)
      {
        if (policy.activation_mode === displayPolicy.value[i].activation_mode)
        {
          ddosProtected = true;
        }
      }
      if (!ddosProtected)
      {
        policyOutput += '<tr><td align="left"><span class="blackText">DDoS Activity</span></td> <td align="left"><span class="redText">' + policy.activation_mode_text + '</span></td></tr>\n';
        setSecurityIssue(site.domain, "policy", policy.name, policy.activation_mode_text);

        siteSummary.ddosActivityMode = "N";
      }
      else
        policyOutput += '<tr><td align="left"><span class="blackText">DDoS Activity</span></td> <td align="left"><span class="greenText">' + policy.activation_mode_text + '</span></td></tr>\n';
    }
    else if (policy.id === 'api.threats.bot_access_control')
    {
      if (policy.block_bad_bots != displayPolicy.block_bad_bots)
      {
        policyOutput += '<tr><td align="left"><span class="blackText">Bot Access Control</span></td> <td><span class="redText">Ignore</span></td></tr>\n';
        setSecurityIssue(site.domain, "policy", "Bot Access Control", policy.block_bad_bots);
      
        siteSummary.blockBadBots = "N";
      }
      else
        policyOutput += '<tr><td align="left"><span class="blackText">Bot Access Control</span></td> <td><span class="greenText">Block Request</span></td></tr>\n';

      if (policy.challenge_suspected_bots != displayPolicy.challenge_suspected_bots)
        policyOutput += '<tr><td align="left">Challenge Suspected Bots</td> <td><span class="orangeText">Captcha Challenge</span></td></tr>\n';
      else
      {
        policyOutput += '<tr><td align="left">Challenge Suspected Bots</td> <td><span class="orangeText">Ignore</span></td></tr>\n';
      }
    }
    else if (policy.id === "api.threats.customRule")
    {
      //Ignore IncapRules
    }
    else
    {
      if (policy.action != displayPolicy.action)
      {
        policyOutput += '<tr><td align="left"><span class="blackText">' + policy.name + '</span></td> <td><span class="redText">' + policy.action_text + '</span></td></tr>\n';
        setSecurityIssue(site.domain.name, "policy", policy.name,  policy.action_text);
        
        if (policy.id === "api.threats.sql_injection")
          siteSummary.sqlInjection = "N";
        else if (policy.id === "api.threats.cross_site_scripting")
          siteSummary.crossSiteScripting = "N";
        else if (policy.id === "api.threats.illegal_resource_access")
          siteSummary.illegalResourceAccess = "N";
        else if (policy.id === "api.threats.api.threats.backdoor")
          siteSummary.backDoorProtection = "N";
        else if (policy.id === "api.threats.remote_file_inclusion")
          siteSummary.remoteFileInclusion = "N";
      }
      else
        policyOutput += '<tr><td align="left"><span class="blackText">' + policy.name + '</span></td> <td><span class="greenText">' + policy.action_text + '</span></td></tr>\n';
    }

  }
  if (!isWebVolDDosPurchased)
  {
    policyOutput += '<tr><td align="left"><span class="blackText"> Volumetric DDoS</span></td> <td align="left"><span class="redText">Not Protected</span></td></tr>\n';
    siteSummary.isWebVolDDosPurchased = "N";
  }
  else
    policyOutput += '<tr><td align="left"><span class="blackText">Volumetric DDoS</span></td> <td align="left"><span class="greenText">Protected</span></td></tr>\n';




  policyOutput += '</table>';

  //Set in global summary struct
  siteSummaryObject.push(siteSummary)

  return (policyOutput);  
}

function buildPolicyReport1(site, isWebVolDDosPurchased)
{
  var siteSummary = {"site": "", "siteId": "", "accountId": "", "status": "", "hasTraffic": "", "blockBadBots": "Y",
  "challengeSuspected": "Y", "backDoorProtection": "Y", "remoteFileInclusion" : "Y" ,"sqlInjection": "Y" ,"crossSiteScripting": "Y",
  "illegalResourceAccess": "Y", "ddosActivityMode": "Y", "origServerProtected": "Y"};

  var policyOutput = '<h3>Security Policies</h3>\n' 
  policyOutput += '<table border="1">\n';
  policyOutput += '<tr><th align="left">Policy</th> <th align="left">Current Setting</th> </tr>\n';

  siteSummary.site = site.domain;
  siteSummary.siteId = site.site_id;
  siteSummary.accountId = site.account_id;
  siteSummary.status = site.status;

  for (var k=0; k<site.security.waf.rules.length; k++)
  {
    var policy = site.security.waf.rules[k]; 
    if (policy == null)
      continue;
    if (policy.id === 'api.threats.ddos')
    {
      if (isWebVolDDosPurchased == false || policy.activation_mode === 'api.threats.ddos.activation_mode.off')
      {
        policyOutput += '<tr><td align="left"><span class="blackText">' + policy.name + '</span></td> <td align="left"><span class="redText">Not Protected</span></td></tr>\n';
        setSecurityIssue(site.domain, "policy", policy.name, policy.activation_mode_text);

        siteSummary.ddosActivityMode = "N";
      }
      else
        policyOutput += '<tr><td align="left"><span class="blackText">' + policy.name + '</span></td> <td align="left"><span class="greenText">Protected</span></td></tr>\n';
    }
    else if (policy.id === 'api.threats.bot_access_control')
    {
      if (policy.block_bad_bots === false)
      {
        policyOutput += '<tr><td align="left"><span class="blackText">Bot Access Control</span></td> <td><span class="redText">Ignore</span></td></tr>\n';
        setSecurityIssue(site.domain, "policy", "Bot Access Control", policy.block_bad_bots);
      
        siteSummary.blockBadBots = "N";
      }
      else
        policyOutput += '<tr><td align="left"><span class="blackText">Bot Access Control</span></td> <td><span class="greenText">Block Request</span></td></tr>\n';

      if (policy.challenge_suspected_bots == true)
        policyOutput += '<tr><td align="left">Challenge Suspected Bots</td> <td><span class="orangeText">Captcha Challenge</span></td></tr>\n';
      else
      {
        policyOutput += '<tr><td align="left">Challenge Suspected Bots</td> <td><span class="orangeText">Ignore</span></td></tr>\n';
      }
    }
    else if (policy.id === "api.threats.customRule")
    {
      //Ignore IncapRules
    }
    else
    {
      if (policy.action === 'api.threats.action.alert' ||
          policy.action == 'api.threats.action.disabled')
      {
        policyOutput += '<tr><td align="left"><span class="blackText">' + policy.name + '</span></td> <td><span class="redText">' + policy.action_text + '</span></td></tr>\n';
        setSecurityIssue(site.domain, "policy", policy.name,  policy.action_text);
        
        if (policy.id === "api.threats.sql_injection")
          siteSummary.sqlInjection = "N";
        else if (policy.id === "api.threats.cross_site_scripting")
          siteSummary.crossSiteScripting = "N";
        else if (policy.id === "api.threats.illegal_resource_access")
          siteSummary.illegalResourceAccess = "N";
        else if (policy.id === "api.threats.api.threats.backdoor")
          siteSummary.backDoorProtection = "N";
        else if (policy.id === "api.threats.remote_file_inclusion")
          siteSummary.remoteFileInclusion = "N";
      }
      else
        policyOutput += '<tr><td align="left"><span class="blackText">' + policy.name + '</span></td> <td><span class="greenText">' + policy.action_text + '</span></td></tr>\n';
    }

  }

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



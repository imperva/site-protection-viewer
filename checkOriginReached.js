var request = require('request');
var fs = require('fs')
var async = require('async');
var settings = require('./settings.js');
var spv = require('./spv.js');
var utils = require("./utils");


var outputData = [];
var originProtectInfo = [];

var serverNameIndex = 0;
var totalNumServers = 0;

var getSubAccountsInfo = settings.getSubAccountsInfo;
var printDebugInfo = settings.printDebugInfo;

//Getting arguments
function getOriginServerInfo(originData, originDataOutpt, informCaller)
{
	console.log("Check " + originData.length/2 + " Origin Servers access (http & https) - this may take a while");
	totalNumServers = originData.length;
	if(printDebugInfo)
		console.time("Check Origin Servers - total time");

	async.forEach(originData, function(site, cb){
		checkOriginServer(site.subAccountId, site.siteId, site.Name, site.serverName, site.Protocol, originDataOutpt, cb);
	}, function(err){
		if (err){
			//deal with the error
			console.log("error in checking sites")
			informCaller();
		}
		if(printDebugInfo)
			console.timeEnd("Check Origin Servers - total time")

		informCaller();
	});
}

function checkOriginServer(subAccountId, siteId, siteName, serverNamesList, protocol, origDataOutpt, siteCb)
{
	var serverNames = serverNamesList.split(';'); // split string on comma space

	async.forEach(serverNames, function(serverName, cb){
		serverNameIndex++
		checkIfReachable(serverNameIndex, subAccountId, siteId, siteName, serverName, protocol, origDataOutpt, cb);
	}, function(err){
		if (err){
			//deal with the error
			console.log("error in checking origin servers")
		}
		siteCb();
	});
}

function checkIfReachable(index, subAccountId, siteId, siteName, serverName, protocol, origDataOutpt, cb)
{
RequestUrl = protocol + '://' + serverName;
var result;
if(printDebugInfo)
	console.log("Check if " + serverName + " is reachable");
request({ url: RequestUrl, method: "GET", followRedirect: false, timeout:settings.originServerConnectionTimeout},
	function (err, resp, data) 
	{
		var isProtected = false;
		if(printDebugInfo)
			console.log("origin server # " + totalNumServers-- + " Server answered: " + serverName)
			
		if (err)
		{
			//Protected Only if error code is in list, else it means origin server is reachable
			for (var i = 0; i < settings.originServerProtectedCode.length; i++)
			{
				if (err.code == settings.originServerProtectedCode[i])
				{
					isProtected = true;
					break;
				}
			}
			if (isProtected == true)
				addOriginInfoToSite(subAccountId, siteId, siteName, serverName, protocol, true, err.code, origDataOutpt);
			else
			{
				if (!err.code)
					err.code = err.reason;
				addOriginInfoToSite(subAccountId, siteId, siteName, serverName, protocol, false, err.code, origDataOutpt);
			}
		}
		else
			addOriginInfoToSite(subAccountId, siteId, siteName, serverName, protocol, false, resp.statusCode, origDataOutpt);
		cb();
	});
}	

function addOriginInfoToSite(subAccountId, siteId, siteName, serverName, protocol, isProtected, code, origDataOutpt)
{
	var notFound = true;	
	for (var i=0; i<origDataOutpt.length; i++)
	{
		if (origDataOutpt[i].domain == siteName)
		{
			origDataOutpt[i].originServers.push({"serverName": serverName, "protocol": protocol, "isProtected": isProtected, "code": code})
			notFound = false;
			break;
		}
	}
	if (notFound)
		origDataOutpt.push({"isFullySorted": false, "isSorted": false, "subAccountId": subAccountId, "siteId": siteId, "domain": siteName,"originServers":[{"serverName": serverName,  "protocol": protocol, "isProtected": isProtected, "code": code}]})
}

//Colored html status
var htmlYesStr = '<td align="left" style="background-color:green;color:white;">Yes</td>';
var htmlNoStr = '<td align="left"style="background-color:red;color:white;">No</td>';

if (settings.useLegacyDisplay)
{
  htmlYesStr = '<td align="left" style="color:green">Yes</td>';
  htmlNoStr = '<td align="left" style="color:red">No</td>';
}  


function buildOriginServersReport(domain, sitesOriginServersInfo, siteSummaryObject)
{
  var originServersOutput = '\n<h3>Origin Servers</h3>\n'
  var origServers = null;
  for (var i = 0; i < sitesOriginServersInfo.originServers.length; i++)
  {
    if (sitesOriginServersInfo.originServers[i].domain == domain)
    {
      sitesOriginServersInfo.originServers[i] = sortOriginServers(sitesOriginServersInfo.originServers[i]);
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
        originServersOutput += '<tr><td align="left">' + origServers[i].serverName + '</td>' +
          '<td align="left">' + origServers[i].protocol + '</td>' + 
          htmlYesStr +
         '<td align="left">' + origServers[i].code + '</td></tr>\n';
      else
      {
        originServersOutput += '<tr><td align="left">' + origServers[i].serverName + '</td>' +
          '<td align="left">' + origServers[i].protocol + '</td>' + 
          htmlNoStr +
          '<td align="left">' + origServers[i].code + '</td></tr>\n';

        //Flag this origin server as accessible  
        spv.setSecurityIssue(domain, "originServer", origServers[i].serverName, "Accessible")
        setOrigServerNotProtectedInHtmlSummaryTable(domain, siteSummaryObject);
      }
    }

    originServersOutput += '</table>';
  }

  return (originServersOutput);
}


function setOrigServerNotProtectedInHtmlSummaryTable(domain, siteSummaryObject)
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


function buildOriginServerSummary(sitesOriginServersInfo, mainAccountInfo, subAccountsOutput)
{
  var originServersOutput = '\n<h2><a name="OriginServers">Origin Servers</a></h2>\n'
  var originServerStatusStr;
  var domainStr = '';
  var curAccountName = '';
  
  originServersOutput += '<table border="1">\n<tr>';
 
  //If account info is added, data should also be sorted differently.
  if (getSubAccountsInfo)
    originServersOutput += '<th align="left">Account</th>';

  //Sort
  sitesOriginServersInfo = sortSiteOrigServers(sitesOriginServersInfo, mainAccountInfo, subAccountsOutput);

  originServersOutput += '<th align="left">Site</th><th align="left">Origin Server</th><th align="left">Protocol</th><th align="left">Is Protected</th><th  align="left">Reason</th> </tr>\n';
 
  for (var i = 0; i < sitesOriginServersInfo.originServers.length; i++)
  {
    domainStr = '';
    if (getSubAccountsInfo)
    {
      if (curAccountName != sitesOriginServersInfo.originServers[i].accountName)
      {
        domainStr += '<td align="left">' + sitesOriginServersInfo.originServers[i].accountName + '</td>';
        curAccountName = sitesOriginServersInfo.originServers[i].accountName;
      }
      else
        domainStr += '<td align="left"></td>';
    }

    domainStr += '<td align="left">' + sitesOriginServersInfo.originServers[i].domain + '</td>';
    
    //Sort results by serverName since responses arrive async
    sitesOriginServersInfo.originServers[i] = sortOriginServers(sitesOriginServersInfo.originServers[i]);

	  for (var j = 0; j < sitesOriginServersInfo.originServers[i].originServers.length; j++)
    {    
      //In order to write site only once per all origin servers
      if (j != 0)
      {
        domainStr = '<td align="left"></td>';
        if (getSubAccountsInfo)
          domainStr += '<td align="left"></td>';
      }
      if (sitesOriginServersInfo.originServers[i].originServers[j].isProtected == true)
        originServerStatusStr = htmlYesStr;	 
      else 
        originServerStatusStr = htmlNoStr; 

      originServersOutput += '<tr>' + domainStr + '<td align="left">' + sitesOriginServersInfo.originServers[i].originServers[j].serverName + '</td>' + 
        '<td align="left">' + sitesOriginServersInfo.originServers[i].originServers[j].protocol + '</td>' + 
         originServerStatusStr +  '<td align="left">' + sitesOriginServersInfo.originServers[i].originServers[j].code + '</td></tr>\n';                                                   
    }
  }

  originServersOutput += '</table>\n';
  return (originServersOutput);
}


function createOriginServerCsv(fileName, sitesOriginServersInfo, mainAccountInfo, subAccountsOutput )
{
  var csvFileOutput = 'Index,';
  var index = 1;

  var originServerCsvPrefix = settings.originServerFileNamePrefix;
  if (originServerCsvPrefix == "")
    originServerCsvPrefix = 'Origin-servers'  

  if (getSubAccountsInfo)
    csvFileOutput += 'Account,';
  //Sort
  sitesOriginServersInfo = sortSiteOrigServers(sitesOriginServersInfo, mainAccountInfo, subAccountsOutput);
  
  csvFileOutput += 'Site,Origin Server,Protocol,Is Protected, Reason, Account ID, Site ID\r\n';

  for (var i = 0; i < sitesOriginServersInfo.originServers.length; i++)
  {
    sitesOriginServersInfo.originServers[i] = sortOriginServers(sitesOriginServersInfo.originServers[i]);

    for (var j = 0; j < sitesOriginServersInfo.originServers[i].originServers.length; j++)
    { 
        csvFileOutput += index + ',';
        index++;

        if(getSubAccountsInfo)
        {
          csvFileOutput += sitesOriginServersInfo.originServers[i].accountName + ',';
        }
        csvFileOutput += sitesOriginServersInfo.originServers[i].domain + ',' +
        sitesOriginServersInfo.originServers[i].originServers[j].serverName + ',' + sitesOriginServersInfo.originServers[i].originServers[j].protocol + ',';
        
        //In order to write site only once per all origin servers
        if (sitesOriginServersInfo.originServers[i].originServers[j].isProtected == true)
          csvFileOutput += 'Y' + ',';
        else
          csvFileOutput += 'N' + ',';

      csvFileOutput += sitesOriginServersInfo.originServers[i].originServers[j].code + "," + 
      sitesOriginServersInfo.originServers[i].subAccountId + "," + sitesOriginServersInfo.originServers[i].siteId + '\r\n';
    }
  }
  utils.saveToFile(originServerCsvPrefix + ' ' + fileName + '.csv', csvFileOutput);
}
  

/*** Sort */
function sortOriginServers(siteOriginServers)
{
  //If already sorted, no need to do this again
  if (siteOriginServers.isSorted)
    return (siteOriginServers);

  siteOriginServers.isSorted = true;
  siteOriginServers.originServers.sort(function (a,b) {
  if((a.serverName < b.serverName) ||
      ((a.serverName == b.serverName) && (a.protocol < b.protocol)))
      return (-1);
  if((a.serverName > b.serverName) ||
      ((a.serverName == b.serverName) && (a.protocol > b.protocol)))
      return (1);  
  });
  return (siteOriginServers);
}

function sortSiteOrigServers(siteOrigServers, mainAccountInfo, subAccountsOutput)
{
  //Check if full array was already sorted, it it was, get out. If not, set flag to true on all elements so sort won't be performed any more.
  if (siteOrigServers.originServers[0].isFullySorted == true)
    return (siteOrigServers);

  for (var i; i < siteOrigServers.originServers.length; i++)
    siteOrigServers.originServers[i].isFullySorted = true;

  //If account info is added, data should also be sorted differently.
  if (getSubAccountsInfo)
  {
    // Enrich data with account name
    enrichOriginServerInfoWithSubAccount(siteOrigServers, mainAccountInfo, subAccountsOutput);
    siteOrigServers.originServers.sort(function (a,b) {
    if ((a.sortByAccountName < b.sortByAccountName) || 
        ((a.sortByAccountName == b.sortByAccountName) && (a.domain < b.domain)))
        return (-1);
    if ((a.sortByAccountName > b.sortByAccountName) || 
        ((a.sortByAccountName == b.sortByAccountName) && (a.domain > b.domain)))
          return (1);  
    });
  }
  else
  {
    siteOrigServers.originServers.sort(function (a,b) {
    if ((a.domain < b.domain) ||
        ((a.domain == b.domain) && (a.serverName < b.serverName)) ||
        ((a.domain == b.domain) && (a.serverName == b.serverName) && (a.protocol < b.protocol)))
          return (-1);
    if ((a.domain > b.domain) ||
        ((a.domain == b.domain) && (a.serverName > b.serverName)) ||
        ((a.domain == b.domain) && (a.serverName == b.serverName) && (a.protocol > b.protocol)))
          return (1);  
      });    
  }

  return (siteOrigServers);
}


function enrichOriginServerInfoWithSubAccount(sitesOriginServersInfo, mainAccountInfo, subAccountsOutput)
{
  spv.enrichArrayElementsWithSubAccount(sitesOriginServersInfo.originServers, mainAccountInfo, subAccountsOutput);
}



module.exports.getOriginServerInfo = getOriginServerInfo;
module.exports.buildOriginServersReport = buildOriginServersReport;
module.exports.buildOriginServerSummary = buildOriginServerSummary;
module.exports.createOriginServerCsv = createOriginServerCsv;
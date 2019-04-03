var request = require('request');
var fs = require('fs')
var async = require('async');
var settings = require('./settings.js');


var outputData = [];
var originProtectInfo = [];

var serverNameIndex = 0;
var totalNumServers = 0;

//Getting arguments
function getOriginServerInfo(originData, originDataOutpt, informCaller)
{
	console.log("Check " + originData.length/2 + " Origin Servers access (http & https) - this may take a while");
	totalNumServers = originData.length;
	if(settings.printDebugInfo)
		console.time("Check Origin Servers - total time");

	async.forEach(originData, function(site, cb){
		checkOriginServer(site.subAccountId, site.Name, site.serverName, site.Protocol, originDataOutpt, cb);
	}, function(err){
		if (err){
			//deal with the error
			console.log("error in checking sites")
			informCaller();
		}
		if(settings.printDebugInfo)
			console.timeEnd("Check Origin Servers - total time")

		informCaller();
	});
}

function checkOriginServer(subAccountId, siteName, serverNamesList, protocol, origDataOutpt, siteCb)
{
	var serverNames = serverNamesList.split(';'); // split string on comma space

	async.forEach(serverNames, function(serverName, cb){
		serverNameIndex++
		checkIfReachable(serverNameIndex, subAccountId, siteName, serverName, protocol, origDataOutpt, cb);
	}, function(err){
		if (err){
			//deal with the error
			console.log("error in checking origin servers")
		}
		siteCb();
	});
}

function checkIfReachable(index, subAccountId, siteName, serverName, protocol, origDataOutpt, cb)
{
RequestUrl = protocol + '://' + serverName;
var result;
if(settings.printDebugInfo)
	console.log("Check if " + serverName + " is reachable");
request({ url: RequestUrl, method: "GET", followRedirect: false, timeout:settings.originServerConnectionTimeout},
	function (err, resp, data) 
	{
		if(settings.printDebugInfo)
			console.log("origin server # " + totalNumServers-- + " Server answered: " + serverName)
			
		if (err)
		{
			//Protected Only if error is connection refused or timeout, other errors might be https errors which means origin server is reachable
			if (err.code == 'ECONNREFUSED' || err.code == 'ETIMEDOUT')
				addOriginInfoToSite(subAccountId, siteName, serverName, protocol, true, err.code, origDataOutpt);
			else
			{
				if (!err.code)
					err.code = err.reason;
				addOriginInfoToSite(subAccountId, siteName, serverName, protocol, false, err.code, origDataOutpt);
			}
		}
		else
			addOriginInfoToSite(subAccountId, siteName, serverName, protocol, false, resp.statusCode, origDataOutpt);
		cb();
	});
}	



function addOriginInfoToSite(subAccountId, siteName, serverName, protocol, isProtected, code, origDataOutpt)
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
		origDataOutpt.push({"subAccountId": subAccountId,"domain": siteName,"originServers":[{"serverName": serverName,  "protocol": protocol, "isProtected": isProtected, "code": code}]})
}

module.exports.getOriginServerInfo = getOriginServerInfo;
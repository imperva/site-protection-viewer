var request = require('request-promise');
var querystring = require('querystring');
var async = require('async');
var settings = require('./settings.js');
var utils = require("./utils");
var spv = require('./spv.js');

function getAAInfoList(timeNow, commonPostData, accountList, aASubAccountOutput, informCaller)
{
	totalNumAccounts = accountList.length;
	if(settings.printDebugInfo)
		console.time("Get account info - total time");

	async.forEachLimit(accountList, settings.numConcurrentConnections, function(account, cb){
		getAaAccountInfo(timeNow, commonPostData, account.accountId, aASubAccountOutput, cb);
	}, function(err){
		if (err){
			//deal with the error
			console.log("error in checking sites")
			informCaller();
		}
		if(settings.printDebugInfo)
			console.timeEnd("Get account info - total time")

		informCaller();
	});
}


function getAaAccountInfo(timeNow, commonPostData, accountId, aAAccountOutput, informCaller)
{
	var dayInMs = 86400000;
	var urlString = 'https://api.imperva.com/analytics/v1/incidents?caid=' + accountId +
		'&api_key=' + commonPostData.api_key + '&api_id=' + commonPostData.api_id;
	
	if (settings.attackAnalyticsPeriodInDays != 0)
		urlString += '&from_timestamp=' + (timeNow._created - (dayInMs * settings.attackAnalyticsPeriodInDays));

// form data
	var options = {
		method: 'GET',
		port: 443,
		uri: urlString,
		host: 'my.incapsula.com',
		resolveWithFullResponse: true, //Set to get HTTP error code
		simple: false,				   //Set to hand HTTP error code
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
				},
		path: '/api.imperva.com/analytics/v1/incidents',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
	}

	request(options)
	.then(function (response) {
		var jResponse = JSON.parse(response.body);
		if (response.statusCode != 200)
        {
		  console.log("Error retreiving AA information - " + response.statusCode + " " + response.statusMessage);
		  //informCaller();
          return;
		}
		setSubAccountAaInfo(accountId, response.body, aAAccountOutput);
		informCaller();
	})
	.catch(function (err) {
		// Deal with the error
		console.log("error in getting account AA info " + err);
		informCaller();
	})
}

function setSubAccountAaInfo(accountId, aAPaylod, aAAccountOutput)
{
	var numCriticalNotBlocked = 0;
	var numMajorNotBlocked = 0;
	var numMinorNotBlocked = 0;
	var numBlockedCritical = 0;
	var numBlockedMajor = 0;
	var numBlockedMinor = 0;

	var fullString = '{ "sites": ' + aAPaylod + '}';
	var jAsPaylod = JSON.parse(fullString);

	for (var i=0; i < jAsPaylod.sites.length; i++)
	{
		if (jAsPaylod.sites[i].severity == "CRITICAL")
		{
			if (jAsPaylod.sites[i].events_blocked_percent != 100)
			numCriticalNotBlocked++;
			else
				numBlockedCritical++
		}
		else if (jAsPaylod.sites[i].severity == "MAJOR")
		{
			if (jAsPaylod.sites[i].events_blocked_percent != 100)
			numMajorNotBlocked++;
			else
				numBlockedMajor++
		}
		else
		{
			if (jAsPaylod.sites[i].events_blocked_percent != 100)
			numMinorNotBlocked++;
			else
				numBlockedMinor++
		}
	}

	aAAccountOutput.push({"subAccountId": accountId, "criticalBlocked": numBlockedCritical, "criticalNotBlocked": numCriticalNotBlocked, "criticalTotal": numBlockedCritical + numCriticalNotBlocked,
								"majorBlocked": numBlockedMajor, "majorNotBlocked": numMajorNotBlocked, "majorTotal": numBlockedMajor + numMajorNotBlocked,
								"minorBlocked": numBlockedMinor, "minorNotBlocked": numMinorNotBlocked, "minorTotal": numBlockedMinor + numMinorNotBlocked});
}



function buildAaReport(isAttackAnalyticsPurchased, aASubAccountInfo, mainAccountInfo, subAccountsOutput)
{
	
	var aAOutput = '\n<h2><a name="AccountIncidentsSummary">Incidents Summary (Attck Analytics)</a></h2>\n';
	var lastDayCaption;
	var curAccountName = '';
	var strCritical = '';
	var strMajor = '';
	var strMinor = '';
	var aAUrl = 'https://my.imperva.com/attack-analytics/ui/incidents?accountId='

	if (settings.attackAnalyticsPeriodInDays == 0)
		lastDayCaption = 'All';
	else if (settings.attackAnalyticsPeriodInDays == 1)
		lastDayCaption = 'Last 1 Day';
	else 
		lastDayCaption = 'Last ' + settings.attackAnalyticsPeriodInDays + ' Days';

	aAOutput = '\n<h2><a name="AccountIncidentsSummary">' + lastDayCaption + ' Incidents Summary (Attack Analytics)</a></h2>\n';

	if (isAttackAnalyticsPurchased)
	{

		spv.enrichArrayElementsWithSubAccount(aASubAccountInfo, mainAccountInfo, subAccountsOutput);
		aAOutput += '<table border="1">\n<tr>';
		
		//Sort
		aASubAccountInfo.sort(function (a,b) {
			if ((a.sortByAccountName < b.sortByAccountName) || 
				(a.sortByAccountName == b.sortByAccountName) && (a.domain < b.domain))
				return (-1);
			if ((a.sortByAccountName > b.sortByAccountName) || 
				(a.sortByAccountName == b.sortByAccountName) && (a.domain > b.domain))
				return (1);  
		});

		aAOutput += '<th align="left">Account</th><th align="left" bgcolor="red">Critical</th><th align="left" bgcolor="orange">Major</th><th align="left" bgcolor="yellow">Minor</th></tr>\n';
		for (var i = 0; i < aASubAccountInfo.length; i++)
		{ 
			if (aASubAccountInfo[i].criticalTotal == 0)
				strCritical = '0';
			else if (aASubAccountInfo[i].criticalNotBlocked > 0)
				strCritical = '<b>' + aASubAccountInfo[i].criticalNotBlocked + ' Not blocked </b> out of '+ aASubAccountInfo[i].criticalTotal ;
			else
				strCritical = aASubAccountInfo[i].criticalTotal + ' Blocked'

			if (aASubAccountInfo[i].majorTotal == 0)
				strMajor = '0';
			else if (aASubAccountInfo[i].majorNotBlocked > 0)
				strMajor = '<b>' + aASubAccountInfo[i].majorNotBlocked + ' Not blocked </b> out of '+ aASubAccountInfo[i].majorTotal ;
			else
				strMajor = aASubAccountInfo[i].majorTotal + ' Blocked'
			
			if (aASubAccountInfo[i].minorTotal == 0)
				strMinor = '0';
			else if (aASubAccountInfo[i].minorNotBlocked > 0)
				strMinor = '<b>' + aASubAccountInfo[i].minorNotBlocked + ' Not blocked </b> out of '+ aASubAccountInfo[i].minorTotal ;
			else
				strMinor = aASubAccountInfo[i].minorTotal + ' Blocked'


			aAOutput += '<tr>';
			aAOutput += '<td align="left"><a href="' + aAUrl + aASubAccountInfo[i].subAccountId + '">' + aASubAccountInfo[i].accountName + '</td>';
			aAOutput += '<td align="left">' + strCritical + '</td>';
			aAOutput += '<td align="left">' + strMajor + '</td>';
			aAOutput += '<td align="left">' + strMinor + '</td>';
			aAOutput += '</tr>\n';
		}
		
		aAOutput += '</table>\n';
	}
	else
	{
		aAOutput += '<h3 style="color:green">You need a subscription to Attack Analytics - Please contact your Imperva representative<h3>\n';		
	}
	return aAOutput;
}

function createAaCsv(isAttackAnalyticsPurchased, fileName, aASubAccountInfo)
{
	// If attack analyics was not purchased, there will not be a csv file
	if (!isAttackAnalyticsPurchased)
	{
		console.log ("You do not have Attack Analytics subscription, therefore csv will not be created")
		return;
	}
	var csvFileOutput;
	var aACsvPrefix = settings.attackAnalyticsFileNamePrefix;
	if (aACsvPrefix == "")
		aACsvPrefix = 'Attack-Analytics'
	
	//Sort by account name
	aASubAccountInfo.sort(function (a,b) {
	if ((a.sortByAccountName < b.sortByAccountName) || 
		(a.sortByAccountName == b.sortByAccountName) && (a.domain < b.domain))
		return (-1);
	if ((a.sortByAccountName > b.sortByAccountName) || 
		(a.sortByAccountName == b.sortByAccountName) && (a.domain > b.domain))
		return (1);  
	});

  	csvFileOutput = 'Index,Account,Critical Blocked,Critical Not Blocked,Major Blocked,Major Not Blocked, Minor Blocked,Minor Not Blocked, Account ID\r\n';

    for (var i = 0; i < aASubAccountInfo.length; i++)
    { 
	  csvFileOutput += (i+1) + ',' + aASubAccountInfo[i].accountName + ',' + 
	  		  aASubAccountInfo[i].criticalBlocked + ',' + aASubAccountInfo[i].criticalNotBlocked + ',' +
              aASubAccountInfo[i].majorBlocked + ',' + aASubAccountInfo[i].majorNotBlocked + ',' +
			  aASubAccountInfo[i].minorBlocked + ',' + aASubAccountInfo[i].minorNotBlocked + ',' +
			  aASubAccountInfo[i].subAccountId + '\r\n';
  }

  utils.saveToFile(aACsvPrefix + ' ' + fileName + '.csv', csvFileOutput);
}


module.exports.getAAInfoList = getAAInfoList;
module.exports.getAaAccountInfo = getAaAccountInfo;
module.exports.buildAaReport = buildAaReport;
module.exports.createAaCsv = createAaCsv;
var request = require('request-promise');
var querystring = require('querystring');
var async = require('async');

//Set since Incapsula API has a limited number of concurrent connections
var numConcurrentConnections = 15;


function getAccountSubInfo1(commonPostData, siteData, statsOutput, statsRawOutput, informCaller)
{
	console.log("getSitesStats");
	console.time("getSitesStats - total time");
	async.forEachLimit(siteData, numConcurrentConnections, function(site, cb){
		getSiteTraffic(commonPostData, site.domain, site.site_id, statsOutput, statsRawOutput, cb);
	}, function(err){
		if (err){
			//deal with the error
			console.log("getSitesStats error")
		}
		console.timeEnd("getSitesStats - total time")
		informCaller();
	});
}
  

function getAccountSubInfo(commonPostData, accountId, accountSubInfoOutput, informCaller)
{
	var postData = {};
	postData.api_id = commonPostData.api_id;
	postData.api_key = commonPostData.api_key;
	postData.account_id = accountId;

// form data
	postData = querystring.stringify(postData);
	var options = {
		method: 'POST',
		port: 443,
		uri: 'https://my.incapsula.com/api/prov/v1/accounts/subscription',
		host: 'my.incapsula.com',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
				},
		body: postData,
		path: '/api/prov/v1/accounts/subscription',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length
		},
	}

	request(options)
	.then(function (response) {
		var isWebDDosPurchased = false;

		var jResponse = JSON.parse(response);
		if (jResponse.res != 0)
        {
          console.log("Error retreiving information - " + jResult.res_message);
          return;
        }

		// Get DDoS purchae status
		for (var i = 0; i < jResponse.planStatus.additionalServices.planSectionRows.length; i++)
		{
			if (jResponse.planStatus.additionalServices.planSectionRows[i].name == "DDoS Protection")
			{
				if (jResponse.planStatus.additionalServices.planSectionRows[i].purchased != "None")
					isWebDDosPurchased = true;
			}
		}

		accountSubInfoOutput.push({"accountName": jResponse.planStatus.accountName, "isWebDDosPurchased": isWebDDosPurchased});

		informCaller();
	})
	.catch(function (err) {
		// Deal with the error
		console.log("error in getting account subscription info " + err);
		informCaller();
	})
}


module.exports.getAccountSubInfo = getAccountSubInfo;
var request = require('request-promise');
var querystring = require('querystring');
var async = require('async');

//Set since Incapsula API has a limited number of concurrent connections
var numConcurrentConnections = 15;

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
		var isWebVolDDosPurchased = false;

		var jResponse = JSON.parse(response);
		if (jResponse.res != 0)
        {
          console.log("Error retreiving information - " + jResult.res_message);
          return;
        }

		// Get Volumetric DDoS purchase status
		for (var i = 0; i < jResponse.planStatus.additionalServices.planSectionRows.length; i++)
		{
			if (jResponse.planStatus.additionalServices.planSectionRows[i].name == "DDoS Protection")
			{
				if (jResponse.planStatus.additionalServices.planSectionRows[i].purchased != "None")
					isWebVolDDosPurchased = true;
			}
		}

		accountSubInfoOutput.push({"accountName": jResponse.planStatus.accountName, "isWebVolDDosPurchased": isWebVolDDosPurchased});

		informCaller();
	})
	.catch(function (err) {
		// Deal with the error
		console.log("error in getting account subscription info " + err);
		informCaller();
	})
}


module.exports.getAccountSubInfo = getAccountSubInfo;
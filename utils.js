
var fs = require('fs')
var settings = require('./settings.js');

function saveToFile(filename, data)
{
  // Save to file
  fs.writeFile(filename, data, function(err) {
    if(err) {
      console.log("Error: " + err.message)
      return// console.log(err);
    }
    console.log("Results saved to " + filename);
  });
}

function getDisplayPolicy(id)
{
  var policy;
  for (var i = 0; i < settings.protectionDisplay.length; i++)
  {
    if (settings.protectionDisplay[i].id == id)
    {
      policy = settings.protectionDisplay[i];
      break;
    }
  }
  return (policy);
}

module.exports.saveToFile = saveToFile;
module.exports.getDisplayPolicy = getDisplayPolicy;
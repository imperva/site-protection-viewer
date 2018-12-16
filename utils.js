
var fs = require('fs')

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

module.exports.saveToFile = saveToFile;
const request = require('request');

//
// Message Services
//
 exports.MESSAGE_SERVICES = [
    {"url":"https://ron-swanson-quotes.herokuapp.com/v2/quotes",
    "access": "res.body[0]"},
    {"url":"https://icanhazdadjoke.com",
    "access": "res.body.joke"},
    {"url":"https://quotes.rest/qod",
    "access": "res.body.content.quotes[\"quote\"]"}
];

//////////////////////////////////////////////////////////////////////////////////////////
//
// Function: getMessageFromService
//
//////////////////////////////////////////////////////////////////////////////////////////
exports.getMessageFromService = function (service, callback) { 

  console.log ("getMessageFromService-", service.url);

    // NOTE: You can disable trying to get quotes from the service by enabling this line
    if (service.url == "https://quotes.rest/qod") {
    // if (false) {
        callback (null, "Bypassing service until time expires");
    } else {

        request(service.url, { json: true }, (err, res, body) => {
        
        // db_messaging ("res.body = ", res.body);
    
        if (service.access == "res.body[0]") {
            callback (err, res.body[0]);
        } else if (service.access == "res.body.joke") {
            callback (err, res.body.joke);
        } else {
    
            // db_messaging ("res.body.contents = " + res.body.contents);
    
            if ("error" in res.body && "message" in res.body.error) {
            callback (err, res.body.error.message);
            } else {
            callback (err, res.body.contents.quotes.quote);
            }
        }
    });
  }
}

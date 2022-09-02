/*
 * Primary file for the API
 *
 */

// Dependencies
var http = require('http');
var https = require('https');
const { type } = require('os');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./lib/config');
var fs = require('fs');
var handlers = require('./lib/handlers');
var helpers = require('./lib/helpers');


helpers.sendTwilioSms('4158375309','Hello!',function(err){
    console.log('This is the error',err);
});


// Instantiate the HTTP server 
var httpServer = http.createServer(function(req,res){
    unifiedServer(req,res);
});

// Start the HTTP server
httpServer.listen(config.httpPort,function(){
    console.log("The server is listening on port "+config.httpPort+" in "+config.envName+" now");
});

// Instantiate the HTTPS server
var httpsServerOptions = {
    'key' : fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
};

var httpsServer = https.createServer(httpsServerOptions,function(req,res){
    unifiedServer(req,res);
});

// Start the HTTPS server
httpsServer.listen(config.httpsPort,function(){
    console.log("The server is listening on port "+config.httpsPort+" in "+config.envName+" now");
});



// All the server logic for both the http and https server
var unifiedServer = function(req,res){
    // Get the URL and parse it 
    var parsedUrl = url.parse(req.url,true);

    // Get the path
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g,'');

    // Get the query string as an object
    var queryStringObject = parsedUrl.query;

    // Get the HTTP Method
    var method = req.method.toLowerCase();

    // Get the headers as an object
    var headers = req.headers;

    // Get the payload, if any
    var decoder = new StringDecoder('utf-8');
    var buffer = ''; //string
    req.on('data',function(data){
        buffer += decoder.write(data);
    });
    req.on('end',function(){
    buffer += decoder.end(); 

    // Choose the handler this req should go to. If one is not found, use notFound handler
    var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;
    
    // Construct the data object to send to the handler
    var data = {
        'trimmedPath': trimmedPath,
        'queryStringObject' : queryStringObject,
        'method' : method,
        'headers' : headers,
        'payload' : helpers.parseJsonToObject(buffer)
    };

    // Router the request to the handler specified in the router
    chosenHandler(data, function(statusCode,payload){
        // Use the status code called back by the handler, or default to 200
        statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

        // use the payload called back by the handler, or default to an empty object
        payload = typeof(payload) == 'object' ? payload : {}; 

        // COnver the payload to a string
        var payloadString =JSON.stringify(payload);

        // Return the response
        res.setHeader('Content-Type','application/json');
        res.writeHead(statusCode); // send the statusCode back to user (that send the request)
        res.end(payloadString);

        // Log the request path
        console.log('Returning this response: ', statusCode, payloadString);
    });
    });
};


// Define a request router
var router = {
    'ping' : handlers.ping  ,
    'users': handlers.users ,
    'tokens' : handlers.tokens,
    'checks' : handlers.checks
};
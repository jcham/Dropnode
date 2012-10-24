var https = require('https');
var querystring = require('querystring');

var loginCookie = null;

exports.clearLoginCookie = function() {
  loginCookie = null;
}

exports.getLoginCookie = function(loginParams, callback) {

  // Setup login request and send
  var reqOptions = {
    hostname: 'www.dropcam.com',
    path: '/api/v1/login.login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',      
    },
  };
  var req = https.request(reqOptions, function(response) {
      console.log('getLoginCookie response headers', response.headers);
      
      var cookie = response.headers['set-cookie'];
      if (cookie) {
        loginCookie = cookie;
        callback(cookie, null);
      }
      
      // Display response (for debugging)
      response.setEncoding('utf8');
      response.on('data', function(chunk) {
        console.log('getLoginCookie data', chunk);
        if (!cookie) {
          callback(null, new Error(chunk));
        }
      });
  });
  req.write(querystring.stringify(loginParams));
  req.on('error', function(e) {
    console.error('getLoginCookie request error', e);
    callback(null, e);
  });
  req.end();
  
}

function stringifyCookie(cookie) {
  if (cookie instanceof Array) {
    return cookie.join(';');
  }
  return cookie;
}

exports.getEventsOnCamera = function(cameraUUID, callback) {
  // Setup login request and send
  var reqOptions = {
    hostname: 'nexusapi.dropcam.com',
    path: '/get_cuepoint?' + querystring.stringify({ uuid: cameraUUID }),
    headers: {
      'Cookie': stringifyCookie(loginCookie),      
    },
  };
  var req = https.request(reqOptions, function(response) {
      console.log('getEventsOnCamera response headers', response.headers);
      
      // Check response 
      if (response.statusCode != 200) {
        callback(null, new Error("HTTP status " + response.statusCode))
        return;
      }
      
      // Accumulate response
      var data = '';
      response.setEncoding('utf8');
      response.on('data', function(chunk) {
        console.log('getEventsOnCamera data', chunk);
        data += chunk;
      });
      response.on('end', function() {
        console.log('getEventsOnCamera end', data);
        callback(JSON.parse(data), null);
      }); 
  });
  req.on('error', function(e) {
    console.error('getEventsOnCamera request error', e);
    callback(null, e);
  });
  req.end();  
}

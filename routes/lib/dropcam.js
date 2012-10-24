var https = require('https');
var querystring = require('querystring');

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

exports.getEventsOnCamera = function(loginCookie, cameraUUID, callback) {
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

exports.getImage = function(loginCookie, cameraUUID, time, width, callback) {
  console.log('getImage', loginCookie, cameraUUID, time, width);
  // Setup login request and send
  var reqOptions = {
    hostname: 'nexusapi.dropcam.com',
    path: '/get_image?' + querystring.stringify({ 
      uuid: cameraUUID,
      time: time,
      width: width
      }),
    headers: {
      'Cookie': stringifyCookie(loginCookie),      
    },
  };
  var req = https.request(reqOptions, function(response) {
      console.log('getImage response headers', response.headers);
      
      // Check response 
      if (response.statusCode != 200) {
        var e = new Error("HTTP status " + response.statusCode);
        e.statusCode = response.statusCode;
        callback(null, null, e);
        return;
      }
      callback(response.headers, null, null);
      
      // Accumulate response
      response.on('data', function(chunk) {
        callback(null, chunk, null);
      });
      response.on('end', function() {
        callback(null, null, null);
      }); 
  });
  req.on('error', function(e) {
    console.error('getImage request error', e);
    callback(null, e);
  });
  req.end();  
}

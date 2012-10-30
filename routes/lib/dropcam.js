var https = require('https');
var querystring = require('querystring');
var events = require('events');

// Parameters:
//  - callback: is `function(cookie, error)`
//
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
      // console.log('getLoginCookie response headers', response.headers);
      
      var cookie = response.headers['set-cookie'];
      if (cookie) {
        callback(cookie, null);
      }
      
      // Display response (for debugging)
      response.setEncoding('utf8');
      var data = '';
      response.on('data', function(chunk) {
        data += chunk;
      });
      response.on('end', function() {
        console.log('getLoginCookie data', data);
        
        if (!cookie) {
          var e = new Error("no cookie in response: " + data);
          e.statusCode = response.statusCode;
          callback(null, e);
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

exports.getEventsOnCamera = function(loginCookie, cameraUUID, start_time, end_time, callback) {
  
  // Setup login request and send
  var params = {
    uuid: cameraUUID,
  };
  if (start_time) { params['start_time'] = start_time; }
  if (end_time)   { params['end_time'] = end_time;   }
  this.getJSON(loginCookie, '/get_cuepoint?' + querystring.stringify(params), callback);
}

// Parameters:
//  - callback: is `function(parsedObject, error)`
//
exports.getJSON = function(loginCookie, path, callback) {

  // Setup HTTP headers
  var headers = {};
  if (loginCookie) {
    headers['Cookie'] = stringifyCookie(loginCookie);
  }
  
  // Setup request and send
  var reqOptions = {
    hostname: 'nexusapi.dropcam.com',
    path: path,
    headers: headers,
  };
  // console.log('getJSON reqOptions', reqOptions);
  var req = https.request(reqOptions, function(response) {
    
      // Accumulate response
      var data = '';
      response.setEncoding('utf8');
      response.on('data', function(chunk) {
        // console.log('getJSON chunk', chunk);
        data += chunk;
      });
      response.on('end', function() {
        // console.log('getJSON end', data);
        try {
          var parsed = JSON.parse(data);
          callback(parsed, null);
        }
        catch (e) {
          console.error("error with data: ", e, data);
          e.statusCode = response.statusCode;
          callback(null, e);
        }
      }); 
  });
  req.on('error', function(e) {
    console.error('getJSON request error', e);
    callback(null, e);
  });
  req.end();  
}

// Parameters:
//  - callback: will get called with function(response).
//
// Return is an http.ClientRequest (don't forget to call .end()!).
//
exports.requestImage = function(loginCookie, cameraUUID, time, width, callback) {
  // console.log('getImage', loginCookie, cameraUUID, time, width);

  // Setup HTTP headers
  var headers = {};
  if (loginCookie) {
    headers['Cookie'] = stringifyCookie(loginCookie);
  }
  
  // Setup login request and send
  var reqOptions = {
    hostname: 'nexusapi.dropcam.com',
    path: '/get_image?' + querystring.stringify({ 
      uuid: cameraUUID,
      time: time,
      width: width
      }),
    headers: headers,
  };
  var req = https.request(reqOptions, callback);
  return req;
}

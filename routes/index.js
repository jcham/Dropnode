
/*
 * GET home page.
 */

var dropcam = require('./lib/dropcam');
var setuper = require('./lib/setuper');
var moment = require('moment');

var redis = require('redis'); 
var redis_client = redis.createClient();
redis_client.on('connect', function() {
  console.log("REDIS CONNECTED");
});

// =========================================================================
// Setup related

setuper.setDefault({
  camerasText: '',
  timezoneOffset: -8,
  timezoneName: 'PST'
});

var setupParseCameras = function(setup) {
  var camerasText = setup.camerasText;
  if (!camerasText) {
    return [];
  }
  // else, split and remove blank
  var cameraStrings = camerasText.split('\n');
  cameraStrings = cameraStrings.filter(function (s) {
    return s.match(/\S/);
  });

  // Parse each line
  var cameras = cameraStrings.map(function (s) {
    var m = s.match(/^\s*(\S+)\s+(.*)/);
    return {
      uuid: m[1],
      name: m[2]
    };
  });
  return cameras;
}

// =========================================================================

exports.login = function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
 
  if (!username || !password) {
    res.render('login');
  }
  else {
    console.log('Attempting to get cookie...');
    dropcam.getLoginCookie({ username:username, password:password }, function(cookie, err) {
      if (!cookie) {
        res.render('login', { message: err.message });
        return;
      }
      console.log('Cookie => ', cookie);
    
      // Save into session
      req.session.loginCookie = cookie;
      req.session.loginUsername = username;
    
      // See if we can load up the setup
      var setupS = redis_client.get("dropnode:setups:username=" + username);
      if (setupS) {
        try {
          var setupNew = JSON.parse(setupS);
          console.log("NEW SETUP:", setupNew);
          setuper.writeToRequest(req, setupNew);
        }
        catch(e) {
          console.error("error reading setup", e);
        }
      }
    
      // Redirect
      res.redirect('/');
    });
  }
}
exports.logout = function(req, res) {
  req.session.loginCookie = null;
  req.session.loginUsername = null;
  setuper.clearFromRequest(req);
  
  res.render('login', { message: 'Logged out!' });
}
exports.post_setup = function(req, res) {
  var setup = setuper.readFromRequest(req);
  if (typeof setup != 'object') {
    // Something is screwed up
    console.error("post_setup error, setup is ", setup, ", correcting...");
    setup = {};
  }

  // See if posting new one
  setup.camerasText = req.body.camerasText;
  setup.timezoneName = req.body.timezoneName;
  setup.timezoneOffset = req.body.timezoneOffset;

  // Save it
  setuper.writeToRequest(req, setup);
  
  // Save it to our database
  var username = req.session.loginUsername;
  if (username) {
    console.log("Writing setup to redis", setup);
    redis_client.sadd("dropnode:usernames", username);
    redis_client.set("dropnode:setups:username=" + username, JSON.stringify(setup));
  }

  // Done
  var message = "Saved setup!";
  res.render('setup', { message: message, setup: setup });
}
exports.setup = function(req, res) {
  var setup = setuper.readFromRequest(req);
  
  res.render('setup', { setup: setup });
}
// =========================================================================

exports.index = function(req, res, next) {
  var setup = setuper.readFromRequest(req);
  var cameras = setupParseCameras(setup);
  res.render('cameras', { cameras: cameras });
}

exports.events = function(req, res, next) {
  var setup = setuper.readFromRequest(req);
  
  var cameras = setupParseCameras(setup);

  // Input parameters
  var cameraUUID = req.params.uuid;
  var days       = req.query.days ? req.query.days : 2;
  var offset     = req.query.offset ? req.query.offset : 0; // in # of days

  // Find the right camera
  var camera = null;
  for (var i in cameras) {
    var c = cameras[i];
    if (c.uuid == cameraUUID) {
      camera = c;
    }
  }

  // Request events
  var end_time = ((new Date).getTime() / 1000) - (offset * 24 * 60 * 60);
  var start_time = end_time - (days * 24 * 60 * 60);
  dropcam.getEventsOnCamera(req.session.loginCookie, cameraUUID, start_time, end_time, function(eventInfos, err) {
    if (!eventInfos) {
      err = err ? err : new Error("unknown error, no eventInfos");
      next(err); return;
    }
    console.log('Got eventInfos', eventInfos);
    
    // Filter events
    eventInfos = eventInfos.filter(function(eventInfo) {
      return (eventInfo.type == 'me2');
    });
    
    // Render!
    var timezoneOffset = setup.timezoneOffset ? (parseFloat(setup.timezoneOffset) * 60 * 60) : 0;
    res.render('events', { 
      camera: camera,
      eventInfos: eventInfos,
      timeBracket: 2,
      renderTime: function(t) {
        t = parseFloat(t) + timezoneOffset;
        var m = moment.utc(t * 1000);
        return m.calendar() + '<br>' + m.format("MMM D, h:mm:ssa") + ' ' + setup.timezoneName;
        },
      imageForTime: function(t) {
        var url = "/get_image?width=200&uuid=" + cameraUUID + "&time=" + t;
        return "<img class='image_thumbnail' src='" + url + "'>";
        }
      });
  });
    
};

exports.api = function(req, res, next) {
  var path = req.path;
  path = path.match(/^(?:\/api)?(.*)/)[1];
  
  dropcam.getJSON(req.session.loginCookie, path, function(data, err) {
    if (err) {
      next(err); return;
    }
    res.send(200);
  });  
}

exports.get_image = function(req, res, next) {
  
  // Get image parameters
  dropcam.getImage(req.session.loginCookie, 
                   req.query.uuid, 
                   req.query.time, 
                   req.query.width, 
    function(headers, chunk, err) { 
      if (err) {
        next(err); return;
      }
      else if (headers) {
        res.set('content-type',   headers['content-type']);
        res.set('content-length', headers['content-length']);
      }
      else if (chunk) {
        res.write(chunk);
      }
      else {
        res.end();
      }
    });
}

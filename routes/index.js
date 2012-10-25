
/*
 * GET home page.
 */

var dropcam = require('./lib/dropcam');
var moment = require('moment');

exports.index = function(req, res) {

  var username = 'joyceandjaime';
  var password = 'hsuandcham';
  var cameraUUID = '3687a9e2782d42d7ab23a1ebc3f7f714';
  var num_days = 2;

  dropcam.getLoginCookie({ username:username, password:password }, function(cookie, err) {
    if (!cookie) {
      console.error(err);
      return;
    }
    console.log('Logged in with', cookie);
    
    // Save into session
    req.session.loginCookie = cookie;
    
    // Request events
    var end_time = (new Date).getTime() / 1000;
    var start_time = end_time - (num_days * 24 * 60 * 60);
    dropcam.getEventsOnCamera(cookie, cameraUUID, start_time, end_time, function(eventInfos, err) {
      if (!eventInfos) {
        console.error(err);
        return;
      }
      console.log('Got eventInfos', eventInfos);
      
      // Filter events
      eventInfos = eventInfos.filter(function(eventInfo) {
        return (eventInfo.type == 'me2');
      });
      
      // Render!
      res.render('events', { 
        cameraUUID: cameraUUID,
        eventInfos: eventInfos,
        renderTime: function(t) { 
          var m = moment.unix(t);
          return m.calendar() + ' (' + m.format(moment.defaultFormat) + ')';
          },
        imageForTime: function(t) {
          var url = "get_image?width=200&uuid=" + cameraUUID + "&time=" + t;
          return "<img class='image_thumbnail' src='" + url + "'>";
          }
        });
    });
  });
  
  // res.render('index', { title: 'Dropnode' });
};

exports.get_image = function(req, res) {
  
  // Get login
  var loginCookie = req.session.loginCookie;
  if (!loginCookie)
    throw new Error("no login cookie!");
    
  // Get image parameters
  dropcam.getImage(loginCookie, 
                   req.query.uuid, 
                   req.query.time, 
                   req.query.width, 
    function(headers, chunk, error) { 
      if (error) {
        console.error('error', error);
        if (error.statusCode) {
          res.statusCode = error.statusCode;
        }
        else {
          res.statusCode = 500;
        }
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

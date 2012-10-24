
/*
 * GET home page.
 */

var dropcam = require('./lib/dropcam');

exports.index = function(req, res) {

  dropcam.getLoginCookie({ username:'joyceandjaime', password:'hsuandcham'}, function(cookie, err) {
    if (!cookie) {
      console.error(err);
      return;
    }
    console.log('Logged in with', cookie);
    dropcam.getEventsOnCamera('3687a9e2782d42d7ab23a1ebc3f7f714', function(eventInfo, err) {
      if (!eventInfo) {
        console.error(err);
        return;
      }
      console.log('Got eventInfo', eventInfo);
    });
  });
  
  res.render('index', { title: 'Dropnode' });
};
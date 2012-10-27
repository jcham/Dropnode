
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');

var app = express();

app.configure(function() {
  app.set('port', process.env.PORT || 3000);

  app.set('views', __dirname + '/views');
  
	app.set('view engine', 'ejs');
	
  app.use(express.favicon());

  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());

  app.use(express.cookieParser('swq382349as9834348sdf783j4348348dc33434'));
  app.use(express.cookieSession());

  app.use(app.router);

  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));

});

app.configure('development', function() {
  app.use(express.errorHandler());
});

// ------------------------------------------------------------------------
// Routes

app.get('/',                      routes.index);
app.all('/login',                 routes.login);
app.all('/logout',                routes.logout);
app.get('/setup',                 routes.setup)
app.post('/setup',                routes.post_setup)

app.get('/events/:uuid',          routes.events);
app.get('/get_image',             routes.get_image);
app.all('/api/*',                 routes.api);

// ------------------------------------------------------------------------
// Generic error handling
app.use(function(err, req, res, next) {
  console.error('**** ', err);
  if (err.isDropcamAuthenticationError &&
      req.headers['Accept'].match(/text\/html/)) {
    res.redirect('/login');
    return;
  } 
  // else
  next(err);
});

// ------------------------------------------------------------------------
// Startup

http.createServer(app).listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});

var defaultSetup = null;

exports.setDefault = function(setup) {
  defaultSetup = setup;  
}
exports.readFromRequest = function(req) {
  if (req.session.setup) {
    var setup = req.session.setup;
    console.log('setup.readFromRequest setup', setup);
    return setup;
  }
  return defaultSetup;
}
exports.writeToRequest = function(req, setup) {
  req.session.setup = setup;
}
var paths = require('./route-paths');

function parseAuthentication(req, res, next) {
  if (req.url === paths.pushQuery || req.url === paths.count) {
    var username    = req.body.username,
        password    = req.body.password,
        gnipAuthKey = req.body.gnipAuthKey;

    // Generate an auth key if username and password were provided.
    if ({}.toString.call(username) === '[object String]' &&
        {}.toString.call(password) === '[object String]') {
      gnipAuthKey = new Buffer(username + ':' + password).toString('base64');
    }

    if (gnipAuthKey === undefined) {
      return sendError(res, 'You must provide a gnipAuthKey or username and password.', true);
    }

    req.body.gnipAuthKey = gnipAuthKey;
  }

  next();
}

function forceSsl(req, res, next) {
  // Modified from Stackoverflow: http://stackoverflow.com/a/23894573
  if (req.url === '/' && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(['https://', req.get('Host'), req.url].join(''));
  } else {
    next();
  }
}

exports.parseAuthentication = parseAuthentication;
exports.forceSsl = forceSsl;

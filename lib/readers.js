var GnipReader = require('gnip-reader'),
    mock = require('./mock');

// Readers are associated with a Session and Gnip User
var readers = {};

function getReader(req, res) {
  var sessionReaders = readers[req.sessionID];
  if (!sessionReaders) {
    sessionReaders = readers[req.sessionID] = {};
  }
  var gnipAuthKey = req.body.gnipAuthKey,
      gnipReader = sessionReaders[gnipAuthKey];
  if (!gnipReader) {
    // Create one if necessary and store it in the sesion.
    var gnipAccount = req.body.gnipAccount,
        gnipStream  = req.body.gnipStream;

    if (gnipAccount === undefined ||
        gnipStream === undefined) {
      return sendError(res, 'You must provide a gnipAccount and gnipStream.', true);
    }

    console.log('Creating new GnipReader with ' + gnipAuthKey);

    var newReader = new GnipReader(gnipAuthKey, undefined, gnipAccount, gnipStream);
    if (mock.mockRead) {
      newReader = new mock.GnipReader(newReader, 2.5);
    }

    gnipReader = sessionReaders[gnipAuthKey] = newReader;
  }

  return gnipReader;
}

exports.getReader = getReader;

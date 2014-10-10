var GnipReader = require('gnip-reader');

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

    // var DummyReader = require('../test/dummy-reader.js');
    // var newReader = new DummyReader('/Users/nixta/Developer/GitHub/nixta/gnip-ferguson/Queries/20140824165438 - #ferguson geo - last 30 days',
    //                                  /^ferguson_Query_Page_[0-9]+.json/, 4);

    var newReader = new GnipReader(gnipAuthKey, undefined, gnipAccount, gnipStream);
    gnipReader = sessionReaders[gnipAuthKey] = newReader;
      
  }

  return gnipReader;
}

exports.getReader = getReader;

var esriGnip = require('esri-gnip');

// Writers are associated with a specific FeatureService URL endpoint.
var writers = {};

function getWriter(req, callback) {
  var sess = req.session;

  var fsUrl = req.body.featureServiceUrl;
  if (fsUrl === undefined) {
    return callback('Must provide a featureServiceUrl parameter.', null);
  }

  // Do we have a writer for this FeatureService Layer?
  var writer = writers[fsUrl];
  if (!writer) {
    // Create one.
    var options = {
      url: fsUrl
    };
    if (req.body.esriAuthToken !== undefined &&
        {}.toString.call(req.body.esriAuthToken) === '[object String]') {
      options.token = req.body.esriAuthToken;
    }
    writer = new esriGnip.Writer(options, function(err) {
      if (!err) {
        // Make sure another appropriate writer wasn't initialized
        // while this one was being set up.
        var writerToReturn = writers[fsUrl] || writer;
        if (writerToReturn !== writer) {
          writer = writerToReturn;
        } else {
          writers[fsUrl] = writer;
        }
        callback(null, writer);
      } else {
        console.log(err);
        callback(err, null);
      }
    });
  } else {
    callback(null, writer);
  }
}

exports.getWriter = getWriter;

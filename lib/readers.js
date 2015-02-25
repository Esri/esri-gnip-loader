var GnipReader = require('gnip-reader');

var env = process.env.NODE_ENV = process.env.NODE_ENV || 'development';
var mock = process.env.MOCK === undefined?false:process.env.MOCK,
    mockRead = mock || (process.env.MOCKREAD === undefined?false:process.env.MOCKREAD);
var mockPath = './mocks/';

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

    var newReader;

    if (mockRead) {
      newReader = new MockReader(mockPath + mockRead + '/GnipPage',
                                       /^[0-9]+.json/);
    } else {
      newReader = new GnipReader(gnipAuthKey, undefined, gnipAccount, gnipStream);
    }

    gnipReader = sessionReaders[gnipAuthKey] = newReader;
  }

  return gnipReader;
}


exports.getReader = getReader;


/// MOCK READER
/// Reads files output if RECORDGNIP=true
function MockReader(dirPath, fileRegex, maxFiles, staggerLoad) {
  var __filenames = setupFilenames(dirPath, fileRegex),
      self = this;

  function setupFilenames(dirPath, fileRegex) {
    var allFilenames = require('fs').readdirSync(dirPath),
        result = [];
    for (var i=0; i<allFilenames.length; i++) {
      var filename = allFilenames[i];
      if (fileRegex.test(filename)) {
        result.push(dirPath + '/' + filename);
      }
    }
    return result;
  }

  function loadData(filename, pageNum, callback) {
    var fs = require('fs');
    console.time('Load ' + filename);
    var data = fs.readFile(filename, 'utf-8', function(err, data) {
      data = JSON.parse(data);
      console.timeEnd('Load ' + filename);
      callback(err, data, pageNum);
    });
  }

  if (maxFiles !== undefined) {
    __filenames = __filenames.slice(0,maxFiles);
  }

  if (staggerLoad === undefined) {
    staggerLoad = 0;
  }

  function delayLoad(filename, i, loadDataCallback) {
    setTimeout(function () {
      loadData(filename, i, loadDataCallback);
    }, staggerLoad * 1000 * i);
  }

  this.fullSearch = function(query, limit, pageCallback, finalCallback) {
    var allData = [],
        count = 0,
        filesRemaining = __filenames.length;

    function loadDataCallback (err, data, pageNum) {
      var gnipRecords = data.gnipRecords,
          recordedPage = data.pageNumber,
          recordedProgress = data.estimatedProgress;

      if (limit !== null && count + gnipRecords.length > limit) {
        gnipRecords = gnipRecords.slice(0, limit - count);
      }

      count += gnipRecords.length;
      pageCallback.call(self, gnipRecords, recordedPage, recordedProgress);

      allData = allData.concat(gnipRecords);
      filesRemaining--;
      if (filesRemaining === 0) {
        finalCallback.call(self, null, allData);
      }
    }

    for (var i=0; i<__filenames.length; i++) {
      if (limit === null || count < limit) {
        delayLoad(__filenames[i], i, loadDataCallback);
      }
    }
  };
}
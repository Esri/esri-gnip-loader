var mock = process.env.MOCK === undefined?false:process.env.MOCK,
    mockRead = mock || (process.env.MOCKREAD === undefined?false:process.env.MOCKREAD),
    mockWrite = mock || (process.env.MOCKWRITE === undefined?false:process.env.MOCKWRITE);

var recordOutput = process.env.RECORDGNIP = ((process.env.RECORDGNIP || false) === 'true');
var quickMock = process.env.QUICKMOCK = ((process.env.QUICKMOCK || false) === 'true');

if (quickMock) {
  console.log('QuickMock Enabled');
}

var mockRoot = './mocks/',
    outputRoot = './output/',
    mockTypes = {
      gnipPage: 'GnipPage',
      queryStatus: 'QueryStatus'
    };

var _ = require('lodash');

/// MOCK READER
/// Reads files output when RECORDGNIP=true
function MockReader(actualReader, staggerLoad) {
  var dirPath = mockRoot + mockRead + '/' + mockTypes.gnipPage,
      fileRegex = /^[0-9]+.json/,
      __filenames = setupFilenames(dirPath, fileRegex),
      self = this;

  function loadData(filename, pageNum, callback) {
    var fs = require('fs');
    console.time('Load ' + filename);
    var data = fs.readFile(filename, 'utf-8', function(err, data) {
      data = JSON.parse(data);
      console.timeEnd('Load ' + filename);
      callback(err, data, pageNum);
    });
  }

  if (staggerLoad === undefined) {
    staggerLoad = 0;
  }

  if (quickMock) {
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

  this.estimate = function(query, callback) {
    actualReader.estimate(query, callback);
  };
}


var mockQueries = {};
function handleQueryStatus(req, res) {
  if (mockWrite) {
    var fs = require('fs'),
        qID = req.query.queryId,
        mockQuery = mockQueries[qID] = mockQueries[qID] || {
          id: qID,
          start: null,
          files: [],
          finalResponse: null
        };

    if (mockQuery.start === null) {
      // Initialize…

      mockQuery.start = new Date();
      mockQuery.finalResponse = { error: 'Something went wrong reading mock data - please report to the server administrator.' };
      mockQuery.mockFiles = setupFilenames(mockRoot + mock + '/QueryStatus', /^[0-9]+.json/);

      if (quickMock) {
        var quickFiles = [],
            fullFiles = mockQuery.mockFiles;
        if (fullFiles.length > 0) {
          quickFiles.push(fullFiles[0]);

          if (fullFiles.length > 1) {
            quickFiles.push(fullFiles[fullFiles.length - 1]);
          }

          mockQuery.mockFiles = quickFiles;
        }
      }
    }

    var currentMock;
    if (mockQuery.mockFiles.length > 0) {
      currentMock = JSON.parse(fs.readFileSync(mockQuery.mockFiles.shift(), 'utf8'));
      if (currentMock.status === 'finished') {
        // That was the last one. We're done here.
        currentMock.endTime = new Date();
        mockQuery.finalResponse = currentMock;
      }
    } else {
      // Report the final response again.
      console.warn('Duplicate 100% response requested!!!');
      currentMock = mockQuery.finalResponse;
    }

    currentMock.id = qID;
    currentMock.startTime = mockQuery.start;

    res.status(200).send(currentMock);

    if (currentMock == mockQuery.finalResponse) {
      setTimeout(function() {
        delete mockQueries[qID];
        console.log('RESET MOCK for query: ' + qID);
      }, 5000);
    }

    return true;
  }
  return false;
}


function setupFilenames(dirPath, fileRegex) {
  var allFilenames = require('fs').readdirSync(dirPath),
      result = [];
  for (var i=0; i<allFilenames.length; i++) {
    var filename = allFilenames[i];
    if (fileRegex.test(filename)) {
      result.push(filename);
    }
  }

  result = _.map(_.sortBy(result, function(filename) {
    return parseInt(filename);
  }), function(filename) {
    return dirPath + '/' + filename;
  });

  return result;
}



// This method will be called if environment variable RECORDGNIP=true.
// It will create a folder for the query under the output folder.
// There will be a GnipPage and QueryStatus folder each wich json files
// that can be read by the mock mechanisms.
function recordMockOutput(writeType, qs, output) {
  if (recordOutput == true) {
    if ((writeType === 'GnipPage' && !mock.mockRead) ||
        (writeType === 'QueryStatus' && !mock.mockWrite)) {
      // We'll log the output to a folder and files within that folder.
      // Can use some of these files later for mock mode if need be.
      var countProperty = '_dev_count_' + writeType;
      if (qs.hasOwnProperty(countProperty)) {
        qs[countProperty] += 1;
      } else {
        qs[countProperty] = 0;
      }

      var outputPage = qs[countProperty];

      if (writeType === 'GnipPage') {
        outputPage = output.pageNumber;
      }

      var fs = require('fs'),
          mkdirp = require('mkdirp'),
          folder = outputRoot + qs.id + '/' + writeType,
          filename = folder + '/' + outputPage + '.json';

      if (!fs.existsSync(folder)) {
        mkdirp.sync(folder);
      }

      fs.writeFile(filename, JSON.stringify(output, null, "  "), function(err) {
        if (!err) {
          console.log('Wrote output to ' + filename);
          // qs.writtenOutputToFile = true;
        } else {
          console.error('Failed to write output to ' + filename);
          console.error(err);
          // qs.writtenOutputToFile = false;
        }
      });
    }
  }
}

exports.mocking = mock || mockRead || mockWrite;
exports.mockRead = mockRead;
exports.mockWrite = mockWrite;

exports.GnipReader = MockReader;

exports.handleQueryStatus = handleQueryStatus;
exports.recordMockOutput = recordMockOutput;

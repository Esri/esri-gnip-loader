var _ = require('lodash');

var qsStatus = require('./query-session-status'),
    pageStatus = require('./page-status');

var pushQueries = {};

function get(queryId, autoCreate) {
  var qs = pushQueries[queryId];
  if (qs === undefined && autoCreate) {
    console.log('Creating query ' + queryId);
    pushQueries[queryId] = qs = {
      id: queryId,
      status: qsStatus.Init,
      reading: false,
      readProgress: 0,
      gnipRecords: [],
      writing: false,
      writeProgress: 0,
      readCount: 0,
      writeCount: 0,
      featureServiceUrl: null,
      runningResult: {},
      pages: {},
      writeResults: {},
      startTime: new Date(),
      endTime: null,
      queueStartTime: null
    };
  }
  return qs;
}

function forOutput(qs) {
  var outProperties = [
    'id',
    'status',
    'readProgress','writeProgress',
    'featureServiceUrl',
    'startTime','endTime',
    'readCount','writeCount',
    'error'
  ];
  if (qs.status === qsStatus.Finished) {
    outProperties.push('writeResults', 'writeRate');
  }
  updateProgress(qs);
  return _.pick(qs, outProperties);
}

function updateProgress(qs) {
  if (qs.gnipRecords !== undefined) {
    qs.readCount = qs.gnipRecords.length;
    var count = 0;
    for (var key in qs.pages) {
      var thisPage = qs.pages[key];
      if (thisPage.status === pageStatus.Written ||
          thisPage.status === pageStatus.Error) {
        // Page complete
        count += thisPage.records.length;
      }
    }
    console.log(count + ' of ' + qs.gnipRecords.length);
    var writeProgress = qs.gnipRecords.length !== 0?100 * (count / qs.gnipRecords.length):0;
    qs.writeProgress = writeProgress;
    qs.writeCount = count;
  }
}

exports.get = get;
exports.forOutput = forOutput;

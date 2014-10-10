var _ = require('lodash');

var pageStatus = require('./page-status'),
    qsStatus = require('./query-session-status'),
    pageStatus = require('./page-status');

function processPageData(data) {
  data.unlocated = _.map(data.unlocated, function(record) {
    return _.pick(record, ['id','link']);
  });

  data.successes = _.map(data.successes, function(item) {
    return _.omit(item, 'success');
  });

  data.failures = _.map(data.failures, function(item) {
    return _.omit(item, 'success');
  });
}

function writePage (task, callback) {
  var qs = task.querySession,
      pageId = task.pageId,
      gnipRecords = task.gnipRecords,
      writer = task.writer,
      runningResult = qs.runningResult;

  var pageLabel = 'Wrote page ' + pageId + ' [' + gnipRecords.length + ' records]';
  console.time(pageLabel);

  var querySessionPage = qs.pages[pageId];
  querySessionPage.status = pageStatus.Writing;
  
  writer.postGnipRecordsToFeatureService(gnipRecords, function (err, data) {
    console.timeEnd(pageLabel);

    if (!err) {
      querySessionPage.status = pageStatus.Written;

      processPageData(data);

      _.merge(runningResult, data, function(a,b) {
        return _.isArray(a) ? a.concat(b) : undefined;
      });
    } else {
      querySessionPage.status = pageStatus.Error;
      console.log('Error writing data to FeatureService: ', err);
    }

    return callback(err);
  });
}

function drain(qs) {
  if (!qs.reading) {
    console.timeEnd('Process');
    console.timeEnd('Queue');
    console.log('Completed query: ' + qs.id);

    var qTime = (new Date().getTime() - qs.queueStartTime.getTime()) / 1000,
        runningResult = qs.runningResult;
    console.log('Successes: ' + runningResult.successes.length);
    console.log(' Failures: ' + runningResult.failures.length);
    console.log('Unlocated: ' + runningResult.unlocated.length);
    console.log('   Errors: ' + runningResult.translationErrors.length);

    qs.writing = false;
    qs.writeProgress = 100;
    qs.status = qsStatus.Finished;
    qs.endTime = new Date();
    qs.writeResults = runningResult;
    qs.writeRate = runningResult.successes.length / qTime;
    console.log('Records/second = ' + qs.writeRate);
  } else {
    console.log('Queue drained, but still reading...');
  }
}

exports.writePage = writePage;
exports.drain = drain;

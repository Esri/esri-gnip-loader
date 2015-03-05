function validateForm(formId) {
  return ($(formId).data('bootstrapValidator').validate().isValid());
}

function validateQuery() {
  return validateForm('#queryForm');
}

function validateEsriPush() {
  return validateForm('#esriForm');
}

function queryAndPush() {
  var queryValid = validateQuery(),
      esriParamsValid = validateEsriPush();
  if (!(queryValid && esriParamsValid)) {
    return;
  }

  $('#queryAlert').hide();
  $('#queryResults').hide();
  $('#queryProgress').fadeIn();
  $('#queryProgressAlert').hide();

  var requestData = getRequestData();

  showModal('query', requestData);

  $.post('/pushQuery', requestData, function (data) {
    console.log(data);
    setProgress('query', data.writeProgress);

    var queryId = data.id;

    var errorRetryCount = 3;
    var pollId = window.setInterval(function getResultStatus() {
      $.get('/queryStatus', {queryId: queryId}, null, "json")
        .done(function (queryStatusData) {
          
          errorRetryCount = 3;
          $('#queryProgressAlert').fadeOut();
          console.log(queryStatusData);

          setProgress('query', queryStatusData.writeProgress);
          if (queryStatusData.status === 'finished') {
            console.log('Finished!');
            window.clearInterval(pollId);
            showQueryResults(queryStatusData);
          }
        })
        .fail(function (err) {
          console.error('Error ' + err.status + ' checking status: ' + err.responseText);
          if (err.status >= 400 && err.status < 500) {
            errorRetryCount = 0;
          }
          if (errorRetryCount <= 0) {
            window.clearInterval(pollId);
            $('#queryProgressAlert').hide();
            $('#queryProgress').hide();
            $('#queryResults').hide();
            $('#queryAlert').show().text('Could not complete request!');
          } else {
            $('#queryProgressAlert').fadeIn();
            $('#queryProgressAlert .message').text('Uh oh. Having trouble getting progress report. Retrying ' + errorRetryCount + ' more time' + (errorRetryCount>1?'s':''));
            errorRetryCount--;
          }
        })
        .always(function (data, status, error) {
          // console.log('Status = ' + status);
        });
    }, 500);
  }, "json").fail(function (err) {
    console.error(err);
    $('#queryProgress').hide();
    $('#queryResults').hide();
    $('#queryAlert').show();
    $('#queryAlert .message').text(err);
  });
}

function estimateCount() {
  if (!validateQuery()) {
    return;
  }

  var units = $(window.event.target).attr('data-bucketsize');

  $('#countProgress').fadeIn();
  $('#countResult').hide();
  $('#estimateAlert').hide();

  var requestData = getRequestData();

  showModal('count', requestData);

  $.post('/count', requestData, function (data) {
    console.log(data);
    var recordCount = 0;
    for (var i=0; i<data.buckets.length; i++) {
      recordCount += data.buckets[i].count;
    }
    $('#countResult').text(recordCount + ' tweets across ' + data.buckets.length + ' ' + data.bucketSize + 's');
    showResult('count');
  }, "json").fail(function(err) {
    console.error(err.responseJSON);
    $('#countProgress').hide();
    $('#estimateAlert').fadeIn();
    $('#estimateAlert > .message').text(err.responseJSON.payload.error.message);
  });
}

function setBucketSize() {
  var units = $(window.event.target).attr('data-bucketsize');
  setEstimateButtonText(units);
}

function setTargetFolder() {
  var folderId = $(window.event.target).attr('data-folder-id'),
      folderName = $(window.event.target).attr('data-folder-name');
  setFolderButtonText(folderId, folderName);
}

function sizeMapTab() {
  var height = $(window).height() - 350;
  $('#queryMapped').css('height', height);
}

function showQueryResults(status) {
  showResult('query', status.writeResults.successes.length + ' records written');

  $('a[href="#queryMapped"]').tab('show');

  status.allErrors = {
    failures: status.writeResults.failures,       // Failed to write to Feature Service
    errors: status.writeResults.translationErrors // Failed during translation to Esri JSON
  };

  setQueryResultsTabHeadings(status);

  showMappedResults(status);
  showUnlocatableResults(status);
  showErrorResults(status);

  $('#queryProgress').hide();
  $('#queryResults').fadeIn();
}

function setQueryResultsTabHeadings(status) {
  var results = status.writeResults,
      errCount = status.allErrors.failures.length + status.allErrors.errors.length;
  $('#queryMapTab .badge').text(results.successes.length > 0?results.successes.length:'');
  $('#queryUnlocTab .badge').text(results.unlocated.length > 0?results.unlocated.length:'');
  $('#queryErrorTab .badge').text(errCount > 0?errCount:'');
}

function setAppropriateProtocol(url) {
  var forceToHTTPS = (window.location.protocol === 'https:');

  if (forceToHTTPS && 
      url.toLowerCase().indexOf('http:') === 0) {
    return url.replace('http:','https:');
  }

  return url;
}

function showMappedResults(status) {
  var width = $(window).width(),
      zoomLevel = width < 1350?2:3;

  createMap('queryMap', zoomLevel, function (queryMap) {
    // Add a results layer

    if (queryMap.graphicsLayerIds.indexOf('queryResults') > -1) {
      console.log('Removing old queryResults layer.');
      var oldLayer = queryMap.getLayer('queryResults');
      queryMap.removeLayer(oldLayer);
    }

    if (queryMap.loaded) {
      addClusterLayer(status, 'queryResults', queryMap);
    } else {
      queryMap.on('load', function(loadEvent) {
        addClusterLayer(status, 'queryResults', loadEvent.map);
      });
    }
  });
}

function showUnlocatableResults(status) {
  var records = status.writeResults.unlocated;

  $('#queryUnlocatable > .content').hide().empty();
  $('#queryUnlocatable > .alert').hide();
  
  if (records.length > 0) {
    var $listRoot = $('<table>', {
      id: 'unlocatedRecordList',
      class: 'table table-striped'
    });

    for (var i=0; i < records.length; i++) {
      var unlocatedRecord = records[i],
          $listItem = $('<tr>').append($('<td>', {
            id: 'unlocatedRecordList_' + i,
            'data-gnip-id': unlocatedRecord.id,
            })
            .append($('<a>', {
              href:unlocatedRecord.link,
              target: '_blank'
            }).text(unlocatedRecord.link)));
      $listRoot.append($listItem);
    }
    $('#queryUnlocatable > .content').show().append($listRoot);
  } else {
    $('#queryUnlocatable > .alert').show();
  }
}

function showErrorResults(allErrors) {

}
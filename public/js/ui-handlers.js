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
    require(['esri/layers/FeatureLayer', 
      'esri/tasks/query', 
      'esri/graphicsUtils', 
      'esri/InfoTemplate',
      '/js/cluster-layer/clusterfeaturelayer.js',
      "esri/renderers/SimpleRenderer",
      "esri/symbols/SimpleMarkerSymbol",
      "esri/symbols/SimpleLineSymbol",
      "esri/symbols/SimpleFillSymbol",
      "esri/symbols/PictureMarkerSymbol",
      "esri/renderers/ClassBreaksRenderer",
      "dojo/_base/Color",
      'dojo/domReady!'], 
      function (FeatureLayer, Query, graphicsUtils, InfoTemplate, ClusterFeatureLayer, SimpleRenderer, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, PictureMarkerSymbol, ClassBreaksRenderer, Color) {
        function addClusterLayer(targetMap) {
          var fsURL = setAppropriateProtocol(status.featureServiceUrl);
          console.log('Adding to map: ' + fsURL);

          var infoTemplate = new InfoTemplate("Tweets", 
            "<p><a target='_blank' href='${actor_link}'>${actor_displayName}</a><span class='pull-right'>${postedTime:DateFormat}</span></p><p>${body}</p><p>Retweeted: ${retweetCount} Favorites: ${favoritesCount}</p><p></p><div class='popup-btn-container'><a target='_blank' href='${link}' role='button' class='btn btn-default btn-sm'><span class='glyphicon glyphicon-envelope'></span> View Tweet</a></div>");

          var defaultSym = new SimpleMarkerSymbol("circle", 16,
                           new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([87,172,238, 0.55]), 3),
                           new Color([255, 255, 255, 1]));

          var clusterLayer = new ClusterFeatureLayer({
                url: fsURL,
                  'distance': 55,
                  'id': 'clusters',
                  'labelColor': '#fff',
                  'resolution': targetMap.extent.getWidth() / targetMap.width,
                  //'singleColor': '#888',
                  'singleSymbol': defaultSym,
                  'singleTemplate': infoTemplate,
                  'useDefaultSymbol': false,
                  'zoomOnClick': true,
                  'showSingles': true,
                  'objectIdField': 'Globalid',
                  outFields: ['activity_id', 'postedTime', 'link', 'actor_displayName', 'actor_link', 'retweetCount', 'favoritesCount', 'body']              
              });

          var renderer = new ClassBreaksRenderer(defaultSym, "clusterCount"),
              small = new SimpleMarkerSymbol("circle", 25,
                      new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([87,172,238,0.5]), 15),
                      new Color([87,172,238,0.75])),
              medium = new SimpleMarkerSymbol("circle", 40,
                      new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([87,172,238,0.5]), 15),
                      new Color([87,172,238,0.75])),
              large = new SimpleMarkerSymbol("circle", 60,
                      new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([87,172,238,0.5]), 15),
                      new Color([87,172,238,0.75])),
              xlarge = new SimpleMarkerSymbol("circle", 80,
                      new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([87,172,238,0.5]), 15),
                      new Color([87,172,238,0.75]));

          // Break values - can adjust easily
          renderer.addBreak(2, 10, small);
          renderer.addBreak(10, 100, medium);
          renderer.addBreak(100, 1000, large);
          renderer.addBreak(1000, 100000, xlarge);

          // Providing a ClassBreakRenderer is also optional
          clusterLayer.setRenderer(renderer);

          targetMap.addLayer(clusterLayer);
        }

        if (queryMap.graphicsLayerIds.indexOf('queryResults') > -1) {
          console.log('Removing old queryResults layer.');
          var oldLayer = queryMap.getLayer('queryResults');
          queryMap.removeLayer(oldLayer);
        }

        if (queryMap.loaded) {
          addClusterLayer(queryMap);
        } else {
          queryMap.on('load', function(loadEvent) {
            addClusterLayer(loadEvent.map);
          });
        }
      }
    );
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
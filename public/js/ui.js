function showModal(modalName, requestData) {
  var queryText = getQueryText(requestData);
  if (queryText === '') {
    $('#' + modalName + 'ModalLabelSuffix').hide();  
  } else {
    $('#' + modalName + 'ModalLabelSuffix').show().find('span').text(queryText);
  }
  $('#' + modalName + 'Progress').show();
  $('#' + modalName + 'Result').hide();
  $('#' + modalName + 'Map').hide();
  $('#' + modalName + 'Modal').modal({
    show: true,
    backdrop: 'static'
  });
}

function getQueryText(requestData) {
  if (requestData !== undefined &&
      requestData.hasOwnProperty('query')) {
    return requestData.query;
  } else {
    return '';
  }
}

function showResult(modalName, value) {
  $('#' + modalName + 'Progress').hide();
  $('#' + modalName + 'Result').fadeIn('slow').text(value);
  $('#' + modalName + 'Map').fadeIn('slow');
}

function setProgress(modalName, value) {
  $('#' + modalName + 'Progress > .progress-bar').css('width',Math.floor(value) + '%');
}

function modalSpinner(message) {
  $('#modalSpinner').modal({
    show: true,
    backdrop: 'static',
    keyboard: false
  });

  $('#modalSpinner .spinner-backing').spin({
    color: '#fff',
    top: '40%',
    lines: 13, // The number of lines to draw
    length: 19, // The length of each line
    width: 10, // The line thickness
    radius: 26, // The radius of the inner circle
    corners: 1, // Corner roundness (0..1)
    rotate: 0, // The rotation offset
    direction: 1, // 1: clockwise, -1: counterclockwise
    speed: 1, // Rounds per second
    trail: 60 // Afterglow percentage
    });

  $('#modalSpinner .spinner-message').text(message);
}

function stopSpinner() {
  $('#modalSpinner .spinner-backing').spin(false);
  $('#modalSpinner').modal('hide');
}

function getRequestData() {
  var requestData = storeData();
  requestData.password = $(gnipPassword).val();

  var token = getToken();
  if (token !== null) {
    requestData.esriAuthToken = token;
  }

  return requestData;
}

function storeData() {
  var requestData = {
    username: $(gnipUsername).val(),
    gnipAccount: $(gnipAccount).val(),
    gnipStream: $(gnipStream).val(),
    query: $('#gnipQuery').val(),
    fromDate: $('#gnipFromDate').val(),
    toDate: $('#gnipToDate').val(),
    maxResults: undefined,
    featureServiceUrl: $('#esriUrl').val(),
    requestLimit: $('#gnipMaxRecords').val(),
    bucketSize: $('#gnipEstimateShortcut').attr('data-bucketsize')
  };

  $.cookie('parameters', requestData, { expires: 90 });

  return requestData;
}

function storePassword() {
  if (__appState().env === 'development') {
    $.cookie('password', window.btoa($(gnipPassword).val()));
  }
}

function __isEmpty(value) {
  return value === undefined || value === null || value === '';
}

function setEstimateButtonText(units) {
  // if (['day','hour','minute'].indexOf(units) == -1) {
  //   console.log('Invalid Bucket Size: ' + units);
  //   return;
  // }

  var readableBucketSize = units.charAt(0).toUpperCase() + units.slice(1) + 's';

  $('#gnipEstimateShortcut').text('Estimate (' + readableBucketSize + ')').attr('data-bucketsize', units);
}

function setFolderButtonText(id, name) {
  $('#esriNewFSFoldersText').text((name || '') + ' /').removeAttr('data-folder-id').attr('data-folder-id', id);
  __appState.targetFolder = id;
  if (id) {
    $.cookie('targetFolder', id, {expires: 90});
  } else {
    $.removeCookie('targetFolder');
  }
}

function makeClearable(inputIds) {
  if ({}.toString.call(inputIds) !== '[object Array]') {
    inputIds = [inputIds];
  }

  function itemChanged() {
    $(this).siblings('span.searchclear').toggle(Boolean($(this).val()));
  }

  function clearClicked() {
    $(this).hide();
    var $input = $(this).siblings('input');
    $input.val('').change().focus();
    var $form = $(this).closest('form');
    if ($form.length > 0 && $form.data('bootstrapValidator') !== undefined) {
      $form.data('bootstrapValidator').revalidateField($input);
    }
  }

  // Set up the clear button, based off http://stackoverflow.com/a/22375617
  // and http://stackoverflow.com/a/9955724
  for (var i=0; i<inputIds.length; i++) {
    var inputId = inputIds[i],
        inputCtrl = $(inputId),
        clearButton = inputCtrl.siblings('span.searchclear');
    if (clearButton.length === 0) {
      clearButton = $('<span class="searchclear glyphicon glyphicon-remove-circle"></span>');
      clearButton.insertAfter(inputCtrl);
    }
    inputCtrl.on('change input propertychange paste', itemChanged);
    clearButton.toggle(Boolean(inputCtrl.val()));
    clearButton.click(clearClicked);  
  }
}

function setDateRange(pickerId) {
  var otherId = pickerId==='#gnipFromDate'?'#gnipToDate':'#gnipFromDate',
      limitKey = pickerId==='#gnipFromDate'?'maxDate':'minDate';
  $(pickerId).datetimepicker({
    onShow: function(ct) {
      var opts = {
        minDate: false,
        maxDate: new Date()
      };
      if ($(otherId).val()) {
        opts[limitKey] = new Date($(otherId).val());
      }
      this.setOptions(opts);
    }
  });
  $(pickerId).on('change input propertychange paste', function (e) {
    $(this).closest('form').bootstrapValidator('revalidateField', pickerId.slice(1));
    $(this).closest('form').bootstrapValidator('revalidateField', otherId.slice(1));
  });
}

function setMock(mockStr) {
  if (mockStr === undefined) {
    mockStr = '';
  }

  if (__appState().env === 'development') {
    mockStr = ('[Development Mode] ' + mockStr).replace(/^\s+|\s+$/g, '');
  }

  if (mockStr !== '') {
    var $mockMessage = $('<span>', {
      class: 'btn btn-xs btn-warning pull-left mock-message',
      style: 'margin: 5px; display: none'
    }).text(mockStr);
    $('body').prepend($mockMessage);
    $('#queryModal .modal-footer').prepend($mockMessage.clone());
    window.setTimeout(function () {
      $('.mock-message').fadeIn();
    }, 500);
  }
}

$(document).ready(function () {
  initializeComponents();
  loadFromCookies();
  setupUIAfterLoad();
  registerValidation();
  initAuthenticationState();
  setNewFeatureServiceUIState(false);
  initGnipSettingsUI();
});

function initializeComponents() {
  $.cookie.json = true;

  $('input, textarea').placeholder();
  $('button').tooltip();

  $().alert();
}

function setupUIAfterLoad() {
  makeClearable(['#gnipUsername', '#gnipPassword', '#gnipAccount', '#gnipStream',
                 '#gnipQuery', '#gnipFromDate', '#gnipToDate', '#gnipMaxRecords',
                 "#esriUrl"]);

  setDateRange('#gnipFromDate');
  setDateRange('#gnipToDate');

  $('#queryMapTab').on('show.bs.tab', function(e) {
    sizeMapTab();
  });

  $(window).resize(function(e) {
    sizeMapTab();
  });
}

function loadFromCookies() {
  var params = $.cookie('parameters');
  if (params !== undefined) {
      $('#gnipUsername').val(params.username);
      $('#gnipAccount').val(params.gnipAccount);
      $('#gnipStream').val(params.gnipStream);
      $('#gnipQuery').val(params.query);
      $('#esriUrl').val(params.featureServiceUrl);
      $('#gnipMaxRecords').val(params.requestLimit);
      if (params.bucketSize !== undefined) {
        setEstimateButtonText(params.bucketSize);
      }
  }

  __appState.targetFolder = $.cookie('targetFolder') || null;

  if (__appState().env === 'development') {
    var encodedPassword = $.cookie('password');
    if (encodedPassword) {
      $('#gnipPassword').val(window.atob(encodedPassword));
    }
  }
}

var gnipInfo = '#gnipInfo',
    gnipUsername = '#gnipUsername',
    gnipPassword = '#gnipPassword',
    gnipAccount = '#gnipAccount',
    gnipStream = '#gnipStream';

var gnipSettingsModal = '#gnipSettingsModal',/*gnipPath = '#gnipPath',*/
    gnipSettingsEdit = '#gnipSettingsEdit',
    gnipSettingsOK = '#gnipSettingsOK';

var gnipPasswordModal = '#gnipPasswordModal',
    gnipPasswordSolo = '#gnipPasswordSolo';

var gnipSettingsSummary = '#gnipSettingsSummary',
    gnipUsernameDisplay = '#gnipUsernameDisplay';

function initGnipSettingsUI() {
  $(gnipSettingsModal).on('hide.bs.modal', function (ev) {
    if (shouldHideGnipSettings()) {
      return false;
    } else {
      storeGnipSettings();
      setGnipUIState();
    }
  });

  $('#gnipForm').submit(function (event) {
    event.preventDefault();
    $(gnipSettingsModal).modal('hide');
    $(gnipSettingsOK).attr('disabled', null);
  });

  $(gnipPasswordModal).on('shown.bs.modal', function (e) {
    $(gnipPasswordSolo).focus();
  });

  $('#gnipPasswordForm').submit(function (event) {
    event.preventDefault();
    if ($(this).data('bootstrapValidator').isValid()) {
      $(gnipPassword).val($(gnipPasswordSolo).val()).change();
      $(gnipPasswordModal).modal('hide');
    }
  });

  setGnipUIState();
}

function storeGnipSettings() {
  storeData();
  storePassword();
}

function editGnipSettings() {
  setGnipUIState(true);
}

function shouldShowGnipPasswordForm() {
  return checkGnipSettingsOK() && !checkGnipPasswordSet();
}

function shouldHideGnipSettings() {
  // Validate some stuff
  return !checkGnipSettingsOK();
}

function checkGnipPasswordSet() {
 return $(gnipPassword).val() !== '';
}

function checkGnipSettingsOK() {
  return $(gnipUsername).val() !== '' && 
         $(gnipAccount).val() !== '' && 
         $(gnipStream).val() !== '';
}

function showGnipPasswordForm() {
  $('#gnipUsernameSolo').text('for ' + $(gnipUsername).val());
  $(gnipPasswordModal).modal({
    show: true,
    backdrop: 'static',
    keyboard: false
  });
}

function showGnipSettingsForm() {
  $(gnipSettingsModal).modal({
    show: true,
    backdrop: 'static'
  });
}

function setGnipUIState(forceVisible) {
  if (forceVisible) {
    showGnipSettingsForm();
  } else {
    if (!checkGnipSettingsOK()) {
      showGnipSettingsForm();
    } else if (!checkGnipPasswordSet()) {
      // We're only missing the password.
      showGnipPasswordForm();
    }
  }

  if (checkGnipSettingsOK()) {
    setGnipSearchPath();
    $(gnipUsernameDisplay).text($(gnipUsername).val());
    $(gnipSettingsEdit).prop('disabled', false).fadeIn();
  } else {
    $(gnipSettingsEdit).prop('disabled', true);
  }
}

function setGnipSearchPath() {
  var account = $(gnipAccount).val(),
      stream  = $(gnipStream).val(),
      username = $(gnipUsername).val();
  var gnipPathStr = 'https://search.gnip.com/accounts/' + account + '/search/' + stream + '.json';
  $(gnipSettingsSummary).fadeIn().text(gnipPathStr);
}

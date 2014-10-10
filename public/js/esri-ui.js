var signInStatus = '#signInStatus',
    signInButton = '#esriSignIn',
    signOutButton = '#esriSignOut',
    signOutLabel = '#esriUsername';

var newFSGroup = '#esriNewFSGroup',
    newFSName = '#esriNewFSName',
    newFSButton = '#esriNewFSCreate';

var checkFSNameAvailable = _.throttle(function () {
  var name = $(newFSName).val();
  isItemNameAvailable(name, function(err, available) {
    console.log(name + ' is ' + (available?'':'not ') + 'available');
    setNewFeatureServiceUIState(available);
  });
}, 200, { trailing: true, leading: false });

function setNewFeatureServiceUIState(enabled) {
  $(newFSButton).prop('disabled', !enabled);
  if (enabled) {
    $(newFSName).removeClass('strikeout');
  } else {
    $(newFSName).addClass('strikeout');
  }
}

function createFS() {
  var name = $(newFSName).val();
  modalSpinner('Creating feature service');
  createFeatureService(name, function (err, data) {
    stopSpinner();

    if (err) {
      console.error('Could not create feature service ' + name);
      console.error(err);
      swal({
        title: 'Could not create feature service ' + name,
        text: err.responseJSON.error,
        type: "error"
      });
    } else {
      console.log(data);
      $('#esriUrl').val(data.layerUrls[0]);
      checkFSNameAvailable();
    }
  });
}

function setUILoggedIn() {
  require(['esri/arcgis/Portal'], function (arcgisPortal) {
    new arcgisPortal.Portal(__appState().oauthInfo.portalUrl).signIn()
      .then(function (portalUser) {
        __appState().portalUser = portalUser;
        updateLoginStatus('');
        $(signOutLabel).text(portalUser.username);
        $(signInButton).fadeOut('fast', function () {
          $(signOutButton).fadeIn('slow', function () {
            $(newFSGroup).fadeIn('slow');
          });
        });
        $(newFSName).on('input', checkFSNameAvailable);
      }
    ).otherwise(
      function(error) {
        console.log("Error occurred while signing in: ", error);
        setUILoggedOut();
      }
    );
  });
}

function updateLoginStatus (newMessage, immediate) {
  $(signInStatus).fadeOut(immediate?0:'slow', function () {
    if (newMessage !== '') {
      $(this).text(' (' + newMessage + ')').fadeIn(immediate?0:'fast');
    }
  });
}

function setUILoggedOut() {
  // updateLoginStatus('not logged in');
  $(signOutButton).fadeOut('fast', function() {
    $(signInButton).fadeIn('slow');
  });
  $(newFSGroup).fadeOut('fast');
}

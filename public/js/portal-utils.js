function isItemNameAvailable(name, callback) {
  if (__appState().portalUser && __appState().portalUser.portal) {
    var p = __appState().portalUser.portal,
        url = p.portalUrl + 'portals/' + p.id + '/isServiceNameAvailable',
        options = {
          name: name,
          type: 'Feature Service',
          f: 'json',
          token: getToken()
        };
    $.post(url, options, function (data) {
      callback(null, data.available);
    }, 'json')
    .fail(function (err) {
      console.error('Could not check "' + name + '": ' + err);
      callback(err);
    });
  }
}

function createFeatureService(name, folderId, callback) {
  var url = '/createFeatureService',
  options = {
    name: name,
    folderId: folderId,
    token: getToken()
  };

  $.post(url, options, function (data) {
    callback(null, data);
  })
  .fail(function (err) {
    console.error(err);
    callback(err, null);
  });
}

function getFolderList(callback) {
  if (__appState().portalUser && __appState().portalUser.portal) {
    var u = __appState().portalUser,
        p = u.portal,
        url = p.portalUrl + 'content/users/' + u.username,
        options = {
          f: 'json',
          token: getToken()
        };
    $.post(url, options, function (data) {
      var folders = data.folders;
      callback(null, folders);
    }, 'json')
    .fail(function (err) {
      console.error('Could not get folder list for "' + u.username + '": ' + err);
      callback(err);
    });
  }
}

function getToken() {
  if (__appState().hasOwnProperty('portalUser') &&
      __appState().portalUser.hasOwnProperty('credential') &&
      __appState().portalUser.credential.hasOwnProperty('token')) {
    return __appState().portalUser.credential.token;  
  }
  return null;
}
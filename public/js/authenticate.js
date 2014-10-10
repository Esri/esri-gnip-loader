function initAuthenticationState() {
  if (__appState().clientId === '') {
    setUILoggedOut();
    return;
  }
  require(['esri/IdentityManager', 'esri/arcgis/OAuthInfo', 'dojo/domReady!'],
    function (esriId, OAuthInfo) {
    __appState().oauthInfo = new OAuthInfo({
      appId: __appState().clientId,
      popup: true
    });
    esriId.registerOAuthInfos([__appState().oauthInfo]);

    esriId.checkSignInStatus(__appState().oauthInfo.portalUrl)
      .then(function () {
        setUILoggedIn();
      })
      .otherwise(function () {
        setUILoggedOut();
      });
  });
}

function doOAuth() {
  if (__appState().clientId === '') {
    swal({
      title: 'OAuth Not Configured!',
      text: 'Please contact the site administrator.',
      type: 'warning'
    });
    return;
  }
  require(['esri/IdentityManager', 'dojo/domReady!'], function (esriId) {
      esriId.getCredential(__appState().oauthInfo.portalUrl, { 
        oAuthPopupConfirmation: false 
      })
      .then(function(a,b,c,d) {
        setUILoggedIn();
      });
  });
}

function signOut() {
  require(['esri/arcgis/Portal', 'esri/IdentityManager', 'dojo/domReady!'], 
    function (arcgisPortal, esriId) {
    __appState().portalUser.portal.signOut();
    __appState().portalUser = undefined;
    setUILoggedOut();
  });
}
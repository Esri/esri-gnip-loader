$('body').data('esri-gnip-loader', {});

function __appState() {
  return $('body').data('esri-gnip-loader');
}

function setClientId(clientId) {
  __appState().clientId = clientId;
}

function setEnv(env) {
  __appState().env = env;
}
var request = require('request'),
  Q = require('q'),
  conflate = require('conflate'),
  util = require('util'),
  events = require('events');

request.defaults({
  json: true
});

function errorFromArcGISResponse(responseJSON) {
  if (responseJSON.hasOwnProperty('error')) {
    var errStr = '';
    if (responseJSON.error.hasOwnProperty('code')) {
      errStr += ' ' + responseJSON.error.code;
    }
    if (responseJSON.error.hasOwnProperty('message') &&
        responseJSON.error.message !== '') {
      if (errStr !== '') {
        errStr += ': ';
      }
      errStr += responseJSON.error.message;
    }
    var details = [];
    if (arguments.length > 1) {
      for (var i=1; i<arguments.length; i++) {
        details.push(arguments[i]);
      }
    }
    if (responseJSON.error.hasOwnProperty('details') &&
        {}.toString.call(responseJSON.error.details) === '[object Array]') {
      details = responseJSON.error.details.concat(details);
    }
    if (details.length > 0) {
      errStr += ' (more details: ' + JSON.stringify(details) + ')';
    }
    return errStr;
  } else {
    return undefined;
  }
}


function Portal(options) {
  events.EventEmitter.call(this);
  if (options === undefined || options === null || options === '') {
    throw new Error('You must provide an options parameter or token');
  }

  if ({}.toString.call(options) === '[object String]') {
    options = {
      token: options
    };
  }

  var _loaded = false;

  this.__defineGetter__('loaded', function () {
    return _loaded;
  });
  this.__defineSetter__('loaded', function (newValue) {
    _loaded = newValue;
    if (_loaded) {
      this.emit('load', this);
    }
  });

  this.get = getRequest;
  this.post = postRequest;

  this.portal = options.portal || 'https://www.arcgis.com';
  this.portalBaseUrl = this.portal + '/sharing/rest';
  this.orgId = '';
  this.orgBaseUrl = '';
  this.userContentUrl = '';

  this.username = options.username || '';
  this.token = options.token || '';

  if (this.token !== '') {
    this.self()
    .then(function (orgJson) {
      this.loaded = true;
      // this.emit('load', this);
    }.bind(this))
    .fail(function (err) {
      this.emit('error', 'Could not read Org Info using token "' + options.token + '"L:\n' + err);
    }.bind(this));
  } else {
    this.loaded = true;
  }

  // ----------------------------------------------------------------------------
  var handleRequest = function (resolve, reject, notify, error, response, body) {
    if (!error && response.statusCode == 200) {
      var jsonBody = JSON.parse(body),
          arcgisErr = errorFromArcGISResponse(jsonBody);
      if (!arcgisErr) {
        resolve.bind(this)(jsonBody);
      } else {
        reject.bind(this)(new Error(arcgisErr));
      }
    } else {
      var errStr = 'Status ' + response.status + error!==null?': ' + error:'';
      reject.bind(this)(new Error(errStr));
    }
  }.bind(this);

  function getRequest(options) {
    return Q.promise(function (resolve, reject, notify) {
      request.get(options, function (error, response, body) {
        handleRequest(resolve, reject, notify, error, response, body);
      });
    });
  }

  function postRequest(options) {
    return Q.promise(function (resolve, reject, notify) {
      request.post(options, function (error, response, body) {
        handleRequest(resolve, reject, notify, error, response, body);
      });
    });
  }
}

util.inherits(Portal, events.EventEmitter);

conflate(Portal.prototype, {
  buildOptions: function(url, form) {
    if (form === undefined) {
      form = {};
    }
    return {
      url: url,
      form: conflate(form, {
        token: this.token,
        f: 'json'
      })
    };
  },
  version: function() {
    // Returns the version of the portal.
    return this.get({
      url: this.portalBaseUrl + '?f=json'
    });
  },
  self: function (token) {
    // Return the view of the portal as seen by the current user, anonymous or logged in.
    token = token || this.token;
    var options = this.buildOptions(this.portalBaseUrl + '/portals/self');
    return this.post(options)
      .then(function (orgJson) {
        if (orgJson.hasOwnProperty('user')) {
          this.orgId = orgJson.user.orgId;
          this.orgBaseUrl = this.portalBaseUrl + '/portals/' + this.orgId;
          this.username = orgJson.user.username;
          this.userContentUrl = this.portalBaseUrl + '/content/users/' + this.username;
          this.token = token;
        }
        return orgJson;
      }.bind(this));
  },
  isNameAvailable: function(name, type, token) {
    return this.get(this.buildOptions(this.orgBaseUrl + '/isServiceNameAvailable', {
        name: name,
        type: type
      }))
      .then(function(output) {
        return output.available;
      });
  },
  createGnipFeatureService: function (name, folderId) {
    var fsTemplate = require('../templates/feature-service.json');
    var layersTemplate = require('../templates/gnip-layer.json');
    var tags = 'Gnip, Esri Gnip Loader, Twitter';

    return this.createFeatureService(name, fsTemplate, layersTemplate, tags, folderId);
  },
  createFeatureService: function (name, serviceDefinition, layersDefinition, tags, folderId) {
    serviceDefinition.name = name;

    var options = this.buildOptions(this.userContentUrl + '/createService', {
      createParameters: JSON.stringify(serviceDefinition),
      outputType: 'featureService',
      tags: tags || ''
    });

    return this.post(options)
      .then(function (fsJSON) {
        if (fsJSON.success) {

          /* Now we add the layer definition */
          var layersOptions = this.buildOptions(fsJSON.serviceurl.replace('/rest/services', '/rest/admin/services') + '/addToDefinition', {
            addToDefinition: JSON.stringify(layersDefinition)
          });

          return this.post(layersOptions)
            .then(function (layerJSON) {
              if (layerJSON.success) {
                var layerUrls = [];
                for (var i=0; i<layerJSON.layers.length; i++) {
                  layerUrls.push(fsJSON.serviceurl + '/' + layerJSON.layers[i].id);
                }
                var output = {
                  itemId: fsJSON.itemId,
                  layerUrls: layerUrls
                };
                if (folderId !== undefined) {
                  var moveOptions = this.buildOptions(this.userContentUrl + '/items/' + fsJSON.itemId + '/move', {
                    folder: folderId
                  });
                  return this.post(moveOptions)
                    .then(function (moveJSON) {
                      if (!moveJSON.success) {
                        console.warn('Could not move item to folder!');
                        console.warn('moveOptions');
                        output['note'] = 'Could not move item to target folder';
                      }

                      return output;
                    });
                } else {
                  // Don't need to move the new service.
                  return output;
                }
              } else {
                throw new Error(errorFromArcGISResponse(layerJSON, name, userName, fsJSON.serviceurl));
              }
            }.bind(this));
          } else {
          throw new Error(errorFromArcGISResponse(fsJSON, name, userName));
        }
      }.bind(this));
  }
});

module.exports = exports = Portal;
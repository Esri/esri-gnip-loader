var maps = {};

function createMap(mapId, zoomLevel, callback) {
  var center = [-4,21],
      zoom = zoomLevel || 2;
  if (!maps.hasOwnProperty(mapId)) {
    require(["application/bootstrapmap", "dojo/domReady!"], 
      function(BootstrapMap) {
        // Get a reference to the ArcGIS Map class
        maps[mapId] = BootstrapMap.create(mapId,{
          basemap:"dark-gray",
          center:center,
          zoom:zoom,
          scrollWheelZoom: false
        });
        callback(maps[mapId]);
    });
  } else {
    var map = maps[mapId];
    map.centerAndZoom(center, zoom);
    callback(map);
  }
}

function addClusterLayer(status, name, targetMap) {
  require(['esri/layers/FeatureLayer', 
    'esri/tasks/query', 
    'esri/graphicsUtils', 
    'esri/InfoTemplate',
    '/js/cluster-layer/clusterfeaturelayer.js',
    'esri/renderers/SimpleRenderer',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleFillSymbol',
    'esri/symbols/PictureMarkerSymbol',
    'esri/renderers/ClassBreaksRenderer',
    'dojo/_base/Color',
    'dojo/domReady!'], 
    function (FeatureLayer, Query, graphicsUtils, InfoTemplate, ClusterFeatureLayer, SimpleRenderer, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, PictureMarkerSymbol, ClassBreaksRenderer, Color) {
      var fsURL = setAppropriateProtocol(status.featureServiceUrl);
      console.log('Adding to map: ' + fsURL);

      var infoTemplate = new InfoTemplate("Tweet", 
        '<p><a target="_blank" href="${actor_link}">${actor_displayName}</a><span class="pull-right">${postedTime:DateFormat}</span></p>' + 
        '<p>${body}</p>' + 
        '<p>Retweeted: ${retweetCount} Favorites: ${favoritesCount}</p>' + 
        '<p></p><div class="popup-btn-container"><a target="_blank" href="${link}" role="button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-envelope"></span> View Tweet</a></div>');

      var defaultSym = new SimpleMarkerSymbol('circle', 16,
                       new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([87,172,238, 0.55]), 3),
                       new Color([255, 255, 255, 1]));

      var clusterLayer = new ClusterFeatureLayer({
            url: fsURL,
              'distance': 55,
              'id': name,
              'labelColor': '#fff',
              'resolution': targetMap.extent.getWidth() / targetMap.width,
              'singleSymbol': defaultSym,
              'singleTemplate': infoTemplate,
              'useDefaultSymbol': false,
              'zoomOnClick': true,
              'showSingles': true,
              'objectIdField': 'Globalid',
              outFields: ['activity_id', 'postedTime', 'link', 'actor_displayName', 'actor_link', 'retweetCount', 'favoritesCount', 'body']              
          });

      var renderer = new ClassBreaksRenderer(defaultSym, 'clusterCount'),
          small = new SimpleMarkerSymbol('circle', 25,
                  new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([87,172,238,0.5]), 15),
                  new Color([87,172,238,0.75])),
          medium = new SimpleMarkerSymbol('circle', 40,
                  new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([87,172,238,0.5]), 15),
                  new Color([87,172,238,0.75])),
          large = new SimpleMarkerSymbol('circle', 60,
                  new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([87,172,238,0.5]), 15),
                  new Color([87,172,238,0.75])),
          xlarge = new SimpleMarkerSymbol('circle', 80,
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
  );
}

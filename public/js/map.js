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
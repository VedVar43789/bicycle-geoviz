import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

// Set your Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoidnZhcmRoYWFuIiwiYSI6ImNtOW01Ynp4NDAyeXIyam9iaDgxY3oxYnIifQ.WlnwSXC76o2u5QeJDP0Umw';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/vvardhaan/cmaliy076013101rff58naw8y', // Use default first for debugging
  center: [-71.09415, 42.36027], // Boston
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

// Define a shared bike lane style
const bikeLaneStyle = {
  'line-color': '#32D400',  // Bright green
  'line-width': 5,
  'line-opacity': 0.6
};

// When the map finishes loading, add the sources and layers
map.on('load', async () => {
  // Add Boston bike lanes
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'
  });

  map.addLayer({
    id: 'bike-lanes-boston',
    type: 'line',
    source: 'boston_route',
    paint: bikeLaneStyle
  });

  // Add Cambridge bike lanes
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://data.cambridgema.gov/api/geospatial/m5mk-sr55?method=export&format=GeoJSON'
  });

  map.addLayer({
    id: 'bike-lanes-cambridge',
    type: 'line',
    source: 'cambridge_route',
    paint: bikeLaneStyle
  });

  console.log('Boston and Cambridge bike lanes added to the map');
});

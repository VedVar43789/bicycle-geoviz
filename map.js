import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

mapboxgl.accessToken = 'pk.eyJ1IjoidnZhcmRoYWFuIiwiYSI6ImNtOW01Ynp4NDAyeXIyam9iaDgxY3oxYnIifQ.WlnwSXC76o2u5QeJDP0Umw';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/vvardhaan/cmall9aqb013601rf9lwp8sdp',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterTripsbyTime(trips, timeFilter) {
  return timeFilter === -1
    ? trips
    : trips.filter((trip) => {
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);
        return (
          Math.abs(startedMinutes - timeFilter) <= 60 ||
          Math.abs(endedMinutes - timeFilter) <= 60
        );
      });
}

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function computeStationTraffic(stations, trips) {
  const departures = d3.rollup(trips, v => v.length, d => d.start_station_id);
  const arrivals = d3.rollup(trips, v => v.length, d => d.end_station_id);

  return stations.map((station) => {
    const id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

map.on('load', async () => {
  try {
    map.addSource('boston_route', {
      type: 'geojson',
      data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
    });

    map.addLayer({
      id: 'bike-lanes',
      type: 'line',
      source: 'boston_route',
      paint: {
        'line-color': '#008000',
        'line-width': 5,
        'line-opacity': 0.6,
      },
    });

    map.addSource('cambridge', {
      type: 'geojson',
      data: './cambridge.geojson',
    });

    map.addLayer({
      id: 'cambridge',
      type: 'line',
      source: 'cambridge',
      paint: {
        'line-color': '#008000',
        'line-width': 4,
        'line-opacity': 0.6,
      },
    });

    const stationData = await d3.json("https://dsc106.com/labs/lab07/data/bluebikes-stations.json");
    const stations = stationData.data.stations;

    const trips = await d3.csv('https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv', (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);
      return trip;
    });

    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('selected-time');
    const anyTimeLabel = document.getElementById('any-time');

    const stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);

    let stationsWithTraffic = computeStationTraffic(stations, trips);

    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(stationsWithTraffic, d => d.totalTraffic)])
      .range([0, 25]);

    let svg = d3.select('#map').select('svg');
    if (svg.empty()) {
      svg = d3.select('#map').append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('z-index', 10);
    }

    let circles = svg.selectAll('circle')
      .data(stationsWithTraffic, d => d.short_name)
      .join('circle')
      .attr('fill', 'steelblue')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.8)
      .attr('r', d => radiusScale(d.totalTraffic))
      .style('--departure-ratio', d => stationFlow(d.departures / d.totalTraffic));

    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0,0,0,0.75)')
      .style('color', 'white')
      .style('padding', '6px 10px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    circles
      .on('mouseover', function (event, d) {
        tooltip
          .style('opacity', 1)
          .html(`
            <strong>${d.name}</strong><br/>
            ${d.totalTraffic} total trips<br/>
            🚲 Departures: ${d.departures}<br/>
            🏁 Arrivals: ${d.arrivals}
          `);
        d3.select(this).attr('stroke-width', 2).attr('fill', '#1E90FF');
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 30}px`);
      })
      .on('mouseout', function () {
        tooltip.style('opacity', 0);
        d3.select(this).attr('stroke-width', 1).attr('fill', 'steelblue');
      });

    function updatePositions() {
      circles
        .attr('cx', d => getCoords(d).cx)
        .attr('cy', d => getCoords(d).cy);
    }

    updatePositions();

    function updateScatterPlot(timeFilter) {
      const filteredTrips = filterTripsbyTime(trips, timeFilter);
      const filteredStations = computeStationTraffic(stations, filteredTrips);

      if (timeFilter === -1) {
        radiusScale.range([0, 25]);
      } else {
        radiusScale.range([3, 50]);
      }

      circles = svg.selectAll('circle')
        .data(filteredStations, d => d.short_name)
        .join('circle')
        .attr('fill', 'steelblue')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8)
        .attr('r', d => radiusScale(d.totalTraffic))
        .attr('cx', d => getCoords(d).cx)
        .attr('cy', d => getCoords(d).cy)
        .style('--departure-ratio', d => stationFlow(d.departures / d.totalTraffic));
    }

    function updateTimeDisplay() {
      const timeFilter = Number(timeSlider.value);

      if (timeFilter === -1) {
        selectedTime.textContent = '';
        anyTimeLabel.style.display = 'block';
      } else {
        selectedTime.textContent = formatTime(timeFilter);
        anyTimeLabel.style.display = 'none';
      }

      updateScatterPlot(timeFilter);
    }

    if (timeSlider) {
      timeSlider.addEventListener('input', updateTimeDisplay);
      updateTimeDisplay();
    }

    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);

  } catch (err) {
    console.error("Error initializing map or fetching data:", err);
  }
});

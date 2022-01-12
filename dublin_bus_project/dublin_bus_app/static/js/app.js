let allBusMarkers = {};
let stops = {};
let map;
let routes = {};
let allStopMarkers = {};
let openWindow;
let openWindowID;
let allTrips = [];
let lastUpdate;

const DUBLIN = {
    north: 53.6,
    south: 53,
    east: -6,
    west: -7,
};

const city_center = { lat: 53.344, lng: -6.267 };

function main() {
    // Set up Google Map
    map = new google.maps.Map(document.getElementById("GoogleMap"), {
        center: city_center,
        // attribute below restricts map within certain bounds
        restriction: {
            latLngBounds: DUBLIN,
            strictBounds: false,
        },
        minZoom: 5,
        zoom: 13,
        mapTypeControl: false,
        options: {
            gestureHandling: 'greedy'
        }
    });


    // Get the static station information.
    stops = {};
    fetch("/statics").then(response => response.json()).then(json => {
        json.forEach(stop => {
            stops[stop.stop_id] = stop;
            [allStopMarkers, map] = createMapMarker(stops, stop.stop_id, map, allStopMarkers);
        });
    });

    // The the routes as an array of arrays of stops.
    fetch("/routes").then(response => response.json()).then(json => {
        for (let i in json) {
            routes[i] = json[i];
        }
        routeOptions(routes);
    });


    getRealTime();
    setInterval(getRealTime, 1000 * 30);
    setInterval(updateBuses, 1000);


    let allStopsHidden = true;
    // Listener to hide/show all stations
    document.getElementById('allStnBtn').addEventListener('click', () => {
        if (allStopsHidden) {
            document.getElementById('allStnBtn').innerHTML = "Hide all stops";
            [allStopMarkers, map] = showAllMarkers(allStopMarkers, map);
        } else {
            document.getElementById('allStnBtn').innerHTML = "Display all stops";
            allStopMarkers = hideStops(allStopMarkers);
        }
        allStopsHidden = !allStopsHidden;
    });

} // End of main function.

function routeOptions(routes) {
    let routeSelect = document.getElementById('routes');
    for (let route in routes) {
        let routeOpt = document.createElement("option");
        routeOpt.value = route;
        routeOpt.text = route; // .toDateString();
        routeSelect.appendChild(routeOpt);
    }
}

function displayRoute() {
    let choice = document.getElementById('routes').value;
    hideStops(allStopMarkers);
    for (let stop in routes[choice]) {
        let s = routes[choice][stop];
        allStopMarkers[s].setMap(map);
    }
}

// Creates a marker
function createMapMarker(stops, stop_id, map, allStopMarkers) {
    let stop = stops[stop_id];
    let marker = new google.maps.Marker({
        position: {lat: stop.stop_lat, lng: stop.stop_lon},
        map: null,
        title: stop_id
    });

    marker.addListener("click", () => {
        popupWindow(marker, stop_id);
    });

    allStopMarkers[stop_id] = marker;
    return [allStopMarkers, map];
}

function getRealTime() {
    // Get real-time prediction information for stop
    fetch("/real_time").then(response => response.json()).then(json => {
        // Wipe the real time info array for stops.
        for (let stop_id in stops){
            stops[stop_id].trips = [];
        }
        allTrips = [];
        json.forEach(trip => {
            // Compile real-time info array for stops
            let stop = stops[trip.stop_id];
            stop.trips.push([trip.arrival_time, trip.trip_id]);

            allTrips.push(trip);
        });
        lastUpdate = new Date().getTime()
    });
}

// Real-time display of buses
function updateBuses() {
    let now = new Date().getTime();
    if (openWindow) { updateOpenWindow(openWindowID, now); }
    allTrips.forEach(trip => {
        if ((trip.arrival_time >= now - (30 * 1000) && (trip.arrival_time <= now + (10 * 1000)))) {
            let stop = stops[trip.stop_id];
            if (!(trip.trip_id in allBusMarkers)) {
                let busNumber = trip.trip_id.split("-")[1];
                allBusMarkers[trip.trip_id] = new google.maps.Marker({
                    position: {lat: stop.stop_lat, lng: stop.stop_lon},
                    map: map,
                    label: {text: `${busNumber}`, color: 'black', fontWeight: "bold"},
                    title: trip.trip_id + " " + new Date(trip.arrival_time),
                    icon: "http://maps.google.com/mapfiles/ms/micons/bus.png"
                });
            } else {
                let bus = allBusMarkers[trip.trip_id];
                bus.setPosition({lat: stop.stop_lat, lng: stop.stop_lon});
                bus.setTitle(trip.trip_id + " " + new Date(trip.arrival_time));
            }
        }
    });
}

// Open popup window above marker
function popupWindow(marker, stop_id) {
    if (openWindow) { openWindow.close(); }
    openWindow = new google.maps.InfoWindow();
    let now = new Date().getTime();
    updateOpenWindow(stop_id, now);
    openWindow.open(map, marker);
    openWindowID = stop_id;
}

// Update content of openWindow
function updateOpenWindow(stop_id, now) {
    let stop = stops[stop_id];
    let trips = stop.trips.sort();
    let display = `<p>${stop.stop_name}<br />`;
    display += `Last Update: ${new Date(lastUpdate).toLocaleTimeString()}<br /><br />`;
    for (let trip in trips) {
        let time = new Date(trips[trip][0]);
        let busNumber = trips[trip][1].split("-")[1];
        if (time - now < 1000 * 60) {
            display += `${busNumber} --> Due<br />`;
        } else {
            display += `${busNumber} --> ${time.toLocaleTimeString()} (${Math.floor((time - now) / 60000)} mins)<br />`;
        }
    }
    display += "</p>";
    openWindow.setContent(display);
}

// Hide all markers
function hideStops(allStopMarkers) {
    document.getElementById('allStnBtn').innerHTML = "Show all stops";
    for (let id in allStopMarkers) {
        allStopMarkers[id].setMap(null);
    }
    return allStopMarkers;
}

// Shows all markers.
function showAllMarkers(allStopMarkers, map){
    for (let id in allStopMarkers) {
        allStopMarkers[id].setMap(map);
    }
    return [allStopMarkers, map];
}




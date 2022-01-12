import React from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { API_URL, GOOGLE_API_KEY } from "../config";
import Timetable from "./RealTime";
import TouristInfo from "./TouristInfo";
import { getDistance } from "geolib";

import fav_marker from "../images/favIcon2.png";
import startMarker from "../images/startIcon.png";
import endMarker from "../images/endIcon.png";
import stopIcon from "../images/busIcon2.png";
import busIcon from "../images/real_bus.png";

import './GoogleMaps.css'
// required global variable
let directionsRenderer = null;
let gMap = null;
const libraries = ['places'];
// route draw flag
let routeDrawn = false;

export default class GoogleMaps extends React.Component {
  constructor(props) {
    // react specific
    super(props);
    this.state = {
      touristInfo: false,
      isInfoWindowOpen: false,
      activeStop: null,
      trips: [],
      busMarkers: [],
      visibleStops: [],
      showButtonText: "Show all stops",
      showButtonPressed: false,
      busButtonText: "Show live bus locations",
      showBusFeed: false,
      user: null,
      mouseLoc: null,
      routeStops: null,
    };

    this.onMarkerClick = this.onMarkerClick.bind(this);
    this.onInfoWindowClose = this.onInfoWindowClose.bind(this);
    this.showAllStationsButton = this.showAllStationsButton.bind(this);
    this.showTouristInfoButton = this.showTouristInfoButton.bind(this);
    this.drawDirectionsRoute = this.drawDirectionsRoute.bind(this);
    this.getMapInstance = this.getMapInstance.bind(this);
    this.clearRoute = this.clearRoute.bind(this);
    this.busMarkerButton = this.busMarkerButton.bind(this);
    this.showStopsNearby = this.showStopsNearby.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
  }

  // Display the stops as the cursor moves
  _onMouseMove(e) {
    if (this.state.routeStops === null && !this.state.showButtonPressed) {
      this.setState({ mouseLoc: e });
      let mouseLoc = {
        lat: this.state.mouseLoc.lat(),
        lon: this.state.mouseLoc.lng(),
      };

      this.props.allStopsKeys.sort((a, b) => {
        let distA = getDistance(mouseLoc, {
          lat: this.props.allStops[a].stop_lat,
          lng: this.props.allStops[a].stop_lon,
        });
        let distB = getDistance(mouseLoc, {
          lat: this.props.allStops[b].stop_lat,
          lng: this.props.allStops[b].stop_lon,
        });
        return distA - distB;
      });
      this.showStopsNearby(this.props.allStopsKeys.slice(0, 9));
    }
  }

  componentDidMount() {
    this._getShapes();
    // This initially pulls the data from the Times table and displays the busses on the map
    this._getLiveData();
    // This re-runs the above function every minute (refreshes the buses)
    this.interval = setInterval(() => {
      this._getLiveData();
    }, 20000);
    this.busInterval = setInterval(() => {
      this.busMarkerMaker();
    }, 2000);

    // get user from local storage
    let user = localStorage.getItem("user");
    if (user) {
      user = JSON.parse(user);
      this.setState({
        user: user,
      });
    }
  }

  // This clears the time intervals (apparantly prevents memory leaks so good practise I read)
  componentWillUnmount() {
    clearInterval(this.interval);
    clearInterval(this.busInterval);
  }

  componentWillReceiveProps(nextProps) {
    // copy selectedRoute, routeStart and routeEnd props to state
    this.setState({ showButtonPressed: false });
    // save selected route to state
    if (
      nextProps.selectedRoute &&
      nextProps.selectedRoute !== this.state.visibleStops
    ) {
      this.setState(
        {
          visibleStops: nextProps.selectedRoute,
          routeStops: nextProps.selectedRoute,
        },
        () => {
          // allow to draw another route
          routeDrawn = false;
        }
      );
    }

    // save route start to state
    if (nextProps.routeStart !== this.state.routeStart) {
      this.setState(
        {
          routeStart: nextProps.routeStart,
        },
        () => {
          // allow to draw another route
          routeDrawn = false;
        }
      );
    }

    // save route end to state
    if (nextProps.routeEnd !== this.state.routeEnd) {
      this.setState(
        {
          routeEnd: nextProps.routeEnd,
        },
        () => {
          // allow to draw another route
          routeDrawn = false;
        }
      );
    }
  }

  _getShapes() {
    fetch(API_URL + "/shapes")
        .then((response) => response.json())
        .then((result) => {
          this.setState({ shapes: result });
        });
  }

  //Fetch live bus data
  _getLiveData = async (e) => {
    // Fetch the data from the Real_time view in the django backend
    await fetch(API_URL + "/real_time")
      .then((response) => response.json())
      .then((result) => {
        let trips = {};
        for (let i = 0; i < result.length; i++) {
          if (!trips[result[i].trip_id]) {
            trips[result[i].trip_id] = [];
          }
          trips[result[i].trip_id].push(result[i]);
        }
        this.setState({ trips: trips }); // save the results of the call to the trips state
      });

    // Run the busMarkerMaker function below
    this.busMarkerMaker();
  };

  busMarkerMaker() {
    if (!this.state.shapes) return;
    let markers = [];
    // This is just the current time
    let now = new Date().getTime();
    // For each element in the trips state (Where the GTFS data was saved)
    for (let trip_id of Object.keys(this.state.trips)) {
      try {
        let markerInfo = {};
        let currentPoint;
        let trip = this.state.trips[trip_id];

        // Get the shape
        let shapeId = trip[0]["trip_id"].split(".").slice(2).join(".");
        let shape = this.state.shapes[shapeId];
        if (trip.length > 1) {
          let startDist;
          let endDist;
          let startTime;
          let endTime;
          let started = false;
          // Where is the bus now in the array of stops?
          trip.forEach(stop => {
            if (now >= stop['departure_time']) {
              started = true;
              startDist = stop['shape_dist'];
              startTime = stop['departure_time'];
            } else if (started) {
              endDist = stop['shape_dist'];
              endTime = stop['arrival_time'];
            }
          });

          // If bus not placeable.
          if (!startTime || !endTime) {
            continue;
          }

          // Slice the shape
          let startIndex = shape.findIndex(x => x.shape_dist === startDist);
          let endIndex = shape.findIndex(x => x.shape_dist === endDist);
          let shapePoints = shape.slice(startIndex, endIndex + 1);

          // Where is the bus now in the shape?
          let hopTime = endTime - startTime;
          let hopDist = endDist - startDist;
          let ratio = (now - startTime) / hopTime;
          let currentDist = startDist + (hopDist * ratio);
          let currentI = shapePoints.findIndex(x => x.shape_dist > currentDist)
          if (currentI === -1) {
            currentPoint = shapePoints[shapePoints.length - 1];
          } else {
            currentPoint = shapePoints[currentI - 1];
          }

          if (currentPoint === undefined) {
            continue;
          }

          markerInfo["lat"] = currentPoint.lat;
          markerInfo["lng"] = currentPoint.lon;
        } else {
          markerInfo["lat"] = trip[0].stop_lat;
          markerInfo["lng"] = trip[0].stop_lon;
        }


        markerInfo["trip_id"] = trip_id;
        markerInfo["bus_number"] = trip[0]["trip_id"].split("-")[1];

        if (markerInfo.lat === undefined) {
          continue;
        }

        // Push marker to the marker array
        markers.push(markerInfo);

      } catch (err) {
        console.log("Error with live bus markers :", err);
      }
    }
    // Set the state Busmarkers equal to the markers array
    if (this.state.showBusFeed) {
      this.setState({ busMarkers: markers });
    }
  }

  busMarkerButton() {
    // show all stations
    if (!this.state.showBusFeed) {
      this.setState({
        showBusFeed: true,
        busButtonText: "Hide live bus locations",
      });
    } else {
      this.setState({
        showBusFeed: false,
        busButtonText: "Show live bus locations",
      });
    }
  }

  onMarkerClick(stop) {
    // close previous infowindow
    this.onInfoWindowClose();
    // open a infowindow for the clicked marker
    this.setState({
      isInfoWindowOpen: true,
      activeStop: stop,
    });
  }

  onInfoWindowClose() {
    // close the infowindow
    this.setState({
      isInfoWindowOpen: false,
      activeMarker: null,
      activeStop: null,
    });
  }

  showAllStationsButton() {
    // show all stations
    if (!this.state.showButtonPressed) {
      this.setState({
        visibleStops: this.props.allStopsKeys,
        showButtonPressed: true,
        showButtonText: "Hide all stops",
      });
    } else {
      this.setState({
        visibleStops: this.state.routeStops || [],
        showButtonPressed: false,
        showButtonText: "Show all stops",
      });
    }
  }

  showTouristInfoButton() {
    // show or hide tourist info panel
    this.setState({ touristInfo: !this.state.touristInfo });
  }

  getMapInstance(mapInstance) {
    // get map instance from GoogleMaps component
    gMap = mapInstance;
  }

  drawDirectionsRoute(route, routeStart, routeEnd) {
    // draw the route from routeStart to routeEnd using Google Directions API
    // exit when no route
    if (!(routeEnd && routeStart)) {
      return;
    }

    // do not draw the route multiple times
    //if(this.state.routeDrawn) {
    if (routeDrawn) {
      return;
    } else {
      routeDrawn = true;
    }

    // select route stops from allStops
    let stopList = [];

    // find stops for the selected route
    for (let item of Object.keys(this.props.allStops)) {
      let index = -1;
      if (
        (index = route.indexOf(this.props.allStops[item]["stop_id"])) !== -1
      ) {
        stopList.push({ index: index, ...this.props.allStops[item] });
      }
    }

    // draw route
    // find start and stop indexes
    let startIndex = 0;
    let start = {};
    stopList.forEach(function (item) {
      if (item.stop_id === routeStart) {
        startIndex = item.index;
        start = item;
      }
    });
    let stopIndex = 0;
    let stop = {};
    stopList.forEach(function (item) {
      if (item.stop_id === routeEnd) {
        stopIndex = item.index;
        stop = item;
      }
    });

    function getStopByIndex(index) {
      // get the stop by route index
      let match = {};
      stopList.forEach(function (item) {
        if (item.index === index) {
          match = item;
        }
      });
      return match;
    }

    // get start and stop index from visible stops
    let waypoints = [];

    // get the stops between start and stop stations (up to 25 waypoints allowed by Google)
    // spread stops evenly
    let step = Math.round(stopList.length / 25);
    let k = 0;
    for (let i = startIndex + 1; i < stopIndex && k < 25; i += step, k++) {
      let item = getStopByIndex(i);
      // create waypoint
      let point = {
        location: {
          lat: item.stop_lat,
          lng: item.stop_lon,
        },
        stopover: false,
      };
      waypoints.push(point);
    }

    // create request object
    let request = {
      origin: {
        lat: start.stop_lat,
        lng: start.stop_lon,
      },
      destination: {
        lat: stop.stop_lat,
        lng: stop.stop_lon,
      },
      waypoints: waypoints,
      travelMode: "WALKING",
      unitSystem: window.google.maps.UnitSystem.METRIC,
    };

    // call directions service and show the route on the map
    let directionsService = new window.google.maps.DirectionsService();
    if (!directionsRenderer) {
      directionsRenderer = new window.google.maps.DirectionsRenderer({
        preserveViewport: true,
      });
    }

    // draw directions for the selected start and end station
    directionsRenderer.setMap(gMap);

    directionsService.route(request, function (result, status) {
      // if successful draw line on map
      if (status === "OK") {
        directionsRenderer.setDirections(result);
      }
    });
  }

  clearRoute() {
    // remove the previous routes from the map
    if (directionsRenderer) {
      directionsRenderer.setMap(null);
    }
  }

  showStopsNearby(stops) {
    // display 10 nearby stops
    this.setState(
      {
        visibleStops: stops,
        routeStart: null,
        routeEnd: null,
      },
      () => {
        routeDrawn = false;
      }
    );
  }

  //Function used to render a different marker icon if it is the start of a route, the end of a route a favourite or a regular stop.
  busMarkerStopStart(index, stop) {
    // Check if Google API is loaded
    if (!window.google) return;
    // Define default value to return
    let defaultValue = {
      url: stopIcon,
      scaledSize: new window.google.maps.Size(20, 20),
    };
    // IF the stop is a favourite return a seperate Icon
    if (this.props.isFavoriteStop(stop)) {
      return {
        url: fav_marker,
        scaledSize: new window.google.maps.Size(25, 25), // scaled size
        //origin: new window.google.maps.Point(0,0), // origin
        //anchor: new window.google.maps.Point(20, 35) // anchor
      };
    }

    /*This if statement checks if a route has been selected*/
    if (this.state.routeStops !== null && !this.state.showButtonPressed) {
      // Switch statment that evaluates the result of taking the index (stop-sequence, zero indexed) from the length of the visible stops
      switch (this.state.visibleStops.length - index) {
        // returns one, its the last stop
        case 1:
          return {
            url: endMarker,
            scaledSize: new window.google.maps.Size(25, 25),
          };

        // if the index ==0 e.g first stop
        case this.state.visibleStops.length:
          return {
            url: startMarker,
            scaledSize: new window.google.maps.Size(25, 25),
          };

        // everything else return this
        default:
          return defaultValue;
      }
    }
    //return this is the if statement is false
    return defaultValue;
  }

  busStopLabel(index) {
    // Pretty much the same logic as above, Just for labels
    if (!(this.state.routeStops === null)) {
      switch (this.state.visibleStops.length - index) {
        // basically if its first or last, add the index (+1 for zero indexing compensation). Else leave it blank
        case 1:
          return {
            text: (index + 1).toString(),
            color: "white",
            fontWeight: "bold",
          };

        case this.state.visibleStops.length:
          return {
            text: (index + 1).toString(),
            color: "white",
            fontWeight: "bold",
          };

        default:
          return;
      }
    }
  }

  render() {
    // inline style for map
    const containerStyle = {
      width: (window.innerWidth < 960)?"98%": "100%",
      height: "100%",
      position: "relative",
    };

    // Get favorite stops ids to make visible
    let favStopIds = this.props.favoriteStops.map((stop) => stop.stop_id);

    // create the map, add markers, infowindow, select with routes
    // see https://react-google-maps-api-docs.netlify.app/
    return (
      <div>
        <div className="bg-light d-flex justify-content-end">
        <button 
            id="legend"
            className="btn mr-1"
          >
          <img id="legendIcon" src={stopIcon}/>
          Click the stop markers for real time information 
          </button>
        </div>
        <div className="bg-light d-flex justify-content-end">
          <button
            className="btn btn-light btn-link mr-1"
            onClick={this.showAllStationsButton}
          >
            {this.state.showButtonText}
          </button>
          <button
            className="btn btn-light btn-link px-2 mr-1"
            onClick={this.showTouristInfoButton}
          >
            {this.state.touristInfo && <>Hide</>}
            {!this.state.touristInfo && <>Show</>} activities & accommodation
          </button>
          <button
            className="btn btn-light btn-link px-2 mr-1"
            onClick={this.busMarkerButton}
          >
            {this.state.busButtonText}
          </button>
        </div>

        <div className="map">
          {/* show the map, centered on Dublin */}
          <LoadScript googleMapsApiKey={GOOGLE_API_KEY} libraries={libraries}>
            <GoogleMap
              onMouseMove={(e) => {
                this._onMouseMove(e.latLng);
              }} // Get the coordinates of the cursor
              onTouchStart={(e) => {
                this._onMouseMove(e.latLng);
              }}
              zoom={13}
              center={this.props.mapCenter}
              mapContainerStyle={containerStyle}
              options={{ gestureHandling: "greedy" }}
              onLoad={this.getMapInstance}
            >
              {/* create a marker for each visible stop */}
              {this.state.visibleStops &&
                this.state.visibleStops.map((stop, index) => {
                  return (
                    <Marker
                      key={"marker" + index}
                      onClick={() =>
                        this.onMarkerClick(this.props.allStops[stop])
                      }
                      position={{
                        lat: this.props.allStops[stop].stop_lat,
                        lng: this.props.allStops[stop].stop_lon,
                      }}
                      icon={this.busMarkerStopStart(index, stop)}
                      label={this.busStopLabel(index)}
                    />
                  );
                })}

              {/* create a marker for each favourite stop */}
              {favStopIds &&
                favStopIds.map((stop, index) => {
                  if (
                    this.props.allStops[stop] &&
                    this.props.allStops[stop].stop_lat
                  ) {
                    return (
                      <Marker
                        key={"marker" + index}
                        onClick={() =>
                          this.onMarkerClick(this.props.allStops[stop])
                        }
                        position={{
                          lat: this.props.allStops[stop].stop_lat,
                          lng: this.props.allStops[stop].stop_lon,
                        }}
                        icon={this.busMarkerStopStart(index, stop)}
                      />
                    );
                  }
                })}

              {/* remove previous route */}
              {!(this.state.routeStart && this.state.routeEnd) &&
                this.clearRoute()}

              {/* draw new route */}
              {this.state.routeStart &&
                this.state.routeEnd &&
                this.drawDirectionsRoute(
                  this.props.selectedRoute,
                  this.state.routeStart,
                  this.state.routeEnd
                )}
              {/* InfoWindow for markers using the Real Time component with activeStop */}
              {this.state.isInfoWindowOpen && (
                <InfoWindow
                  position={{
                    lat: this.state.activeStop.stop_lat,
                    lng: this.state.activeStop.stop_lon,
                  }}
                  onCloseClick={this.onInfoWindowClose}
                >
                  <>
                    {this.props.getFavoriteStopName(
                      this.state.activeStop.stop_id
                    )}
                    <Timetable stop={this.state.activeStop} />

                    {this.state.user && (
                      <>
                        {!this.props.isFavoriteStop(
                          this.state.activeStop.stop_id
                        ) && (
                          <button
                            className="btn btn-link"
                            onClick={() =>
                              this.props.addToFavoriteStops(
                                this.state.activeStop
                              )
                            }
                          >
                            Add to favourites
                          </button>
                        )}
                        {this.state.user &&
                          this.props.isFavoriteStop(
                            this.state.activeStop.stop_id
                          ) && (
                            <button
                              className="btn btn-link"
                              onClick={() =>
                                this.props.removeFavoriteStop(
                                  this.state.activeStop.stop_id
                                )
                              }
                            >
                              Remove from favourites
                            </button>
                          )}
                      </>
                    )}
                  </>
                </InfoWindow>
              )}

              {/* Create the live bus markers ,
                Pulls data from the Busmarker state (filled in the BusMarkerMaker)
                And creates a marker with the data*/}
              {this.state.busMarkers.map((bus) => {
                return (
                  <Marker
                    visible={this.state.showBusFeed}
                    key={bus.trip_id}
                    position={{ lat: bus.lat, lng: bus.lng }}
                    label={{
                      text: bus.bus_number,
                      color: "white",
                      fontWeight: "bold",
                    }}
                    icon={busIcon}
                    // scaledSize: new window.google.maps.Size(50, 50), // scaled size
                    // origin: new window.google.maps.Point(0,0), // origin
                    // anchor: new window.google.maps.Point(0, 0) // anchor
                  />
                );
              })}
              <TouristInfo
                showMenu={this.state.touristInfo}
                stopsNearby={this.showStopsNearby}
              />
            </GoogleMap>
          </LoadScript>
        </div>
      </div>
    );
  }
}

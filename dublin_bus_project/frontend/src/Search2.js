import { API_URL } from "./config";

import { Component } from "react";
import GoogleMaps from "./components/GoogleMaps";
import RoutesPlanner from "./components/RoutesPlanner.jsx";
import PredictionView from "./components/PredictionView";
import Axios from "axios";
import spinner from "./spinner.gif";

export default class Search2 extends Component {
  constructor(props) {
    super(props);
    this.state = {
      routes: {},
      allStops: {},
      selectOptions: [],
      visibleStops: [],
      mapCenter: { lat: 53.344, lng: -6.267 }, // Dublin center,
      predictionResult: null,
      showStops: false, // show bus stop markers
      favoriteStops: [],
      favoriteRoutes: [],
      journeyCost: null,
    };

    this.updateMap = this.updateMap.bind(this);
    this.handlePredictionResult = this.handlePredictionResult.bind(this);
    this.isFavoriteStop = this.isFavoriteStop.bind(this);
    this.addToFavoriteStops = this.addToFavoriteStops.bind(this);
    this.removeFavoriteStop = this.removeFavoriteStop.bind(this);
    this.getFavoriteStopName = this.getFavoriteStopName.bind(this);
    this.handleJourneyCost = this.handleJourneyCost.bind(this);
    this.addToFavouriteRoutes = this.addToFavouriteRoutes.bind(this);
    this.isFavoriteRoute = this.isFavoriteRoute.bind(this);
    this.removeFromFavouriteRoutes = this.removeFromFavouriteRoutes.bind(this);
    this.updateFavouriteOptions = this.updateFavouriteOptions.bind(this);
  }

  componentDidMount() {
    // fetch stations
    fetch(API_URL + "/stops")
      .then((response) => response.json())
      .then((stops) => {
        // store stops in state
        this.setState({ allStopsKeys: Object.keys(stops), allStops: stops });

        // fetch routes
        fetch(API_URL + "/route_list")
          .then((response) => response.json())
          .then((routes) => {
            // store routes in state
            this.setState({ routes: routes });

            // configure the select component; see https://www.npmjs.com/package/react-select
            let keys = Object.keys(routes);
            let options = keys.map((route) => {
              let routeArr = routes[route];
              let lastStop = routeArr[routes[route].length - 1];
              let lastStopName =
                this.state.allStops[lastStop].stop_name.split(",")[0];
              let firstStop = routeArr[0];
              let firstStopName =
                this.state.allStops[firstStop].stop_name.split(",")[0];
              return {
                value: route,
                label:
                  route.split(",")[0] + `, ${firstStopName} to ${lastStopName}`,
              };
            });

            // Update selected options but also keep the original options
            this.setState(
              {
                //selectOptions: favourites.concat(options),
                originalOptions: options,
              },
              () => {
                // update favourite routes
                this.updateFavouriteOptions();
              }
            );
          });
      });

    // get user from local storage
    let user = localStorage.getItem("user");
    if (user) {
      user = JSON.parse(user);
      this.setState({
        user: user,
      });

      // get favourite stops
      // get list of favourite stops
      Axios.defaults.withCredentials = true;
      Axios.get(API_URL + "/account/favorite/stops", { withCredentials: true })
        .then((fav) => {
          //console.log('got data', fav.data)
          this.setState({
            favoriteStops: fav.data,
          });
        })
        .catch(() => {
          console.log("API issue with fav stops");
        });

      // get list of favourite routes
      Axios.defaults.withCredentials = true;
      Axios.get(API_URL + "/account/favorite/routes", { withCredentials: true })
        .then((fav) => {
          //console.log('got data', fav.data)
          this.setState({
            favoriteRoutes: fav.data,
          });
        })
        .catch(() => {
          console.log("API issue with fav routes");
        });
    } else {
      // reset favourite stops and routes state
      this.setState({
        favoriteStops: [],
        favoriteRoutes: [],
      });
    }
  }

  updateMap(selectedOption) {
    console.log("new route selected");
    // update the map when a route is selected from the Journey Planner
    // find the selected route (selectedOption.value)
    let route = this.state.routes[selectedOption.value];
    // update visible stops with the selected stops, center map on first stop
    this.setState({
      selectedRoute: route,
      selectedRouteName: selectedOption.label,
      selectedRouteId: selectedOption.value,
      mapCenter: {
        lat: this.state.allStops[route[0]].stop_lat,
        lng: this.state.allStops[route[0]].stop_lon,
      },
      routeStart: null, // reset route start
      routeEnd: null, // reset route end
      predictionResult: null, // reset prediction result on route change
    });
  }

  handlePredictionResult(response, routeStart, routeEnd) {
    // the prediction result comes out from the Journey Planner into this function
    // send the route start and end to the map
    console.log("prediction response received: " + response.data);
    this.setState({
      predictionResult: response.data,
      routeStart: routeStart,
      routeEnd: routeEnd,
    });
  }

  //gets the journey cost from journeyplanner
  handleJourneyCost(response) {
    this.setState({ journeyCost: response });
  }

  isFavoriteStop(stop_id) {
    // check if the stop is a favorite stop
    try {
      return (
        this.state.favoriteStops.filter((item) => item.stop_id === stop_id)
          .length === 1
      );
    } catch (e) {
      return false;
    }
  }

  getFavoriteStopName(stop_id) {
    // get the favorite stop name
    try {
      return (
        <h6 className="text-info">
          {
            this.state.favoriteStops.filter(
              (item) => item.stop_id === stop_id
            )[0]["name"]
          }
        </h6>
      );
    } catch (e) {
      return <></>;
    }
  }

  addToFavoriteStops(stop) {
    if (this.state.user) {
      // save stop name
      let stop_name = prompt(
        "Please provide a name for the stop",
        "Bus stop " + stop.stop_id
      );
      // add active stop to favorite stops
      Axios.defaults.withCredentials = true;
      Axios.post(
        API_URL + "/account/favorite/stop/" + stop.stop_id,
        { name: stop_name, stop_name: stop.stop_name },
        { withCredentials: true }
      ).then((res) => {
        let favoriteStops = this.state.favoriteStops || [];
        favoriteStops.push({ stop_id: stop.stop_id, name: stop_name });
        this.setState({
          favoriteStops: favoriteStops,
          message: "Saved to favourites",
        });
      });
    }
  }

  removeFavoriteStop(stop_id) {
    if (this.state.user) {
      // remove stop from favourite stops
      if (window.confirm("Do you really wish to remove this favourite stop?")) {
        Axios.defaults.withCredentials = true;
        Axios.delete(API_URL + "/account/favorite/stop/" + stop_id, {
          withCredentials: true,
        }).then((fav) => {
          // update favorite stops list
          let favoriteStops = this.state.favoriteStops || [];
          favoriteStops = favoriteStops.filter(
            (item) => item.stop_id !== stop_id
          );
          this.setState({
            favoriteStops: favoriteStops,
          });
        });
      }
    }
  }

  addToFavouriteRoutes(routeId, routeName) {
    // add a route to favourite routes
    if (this.state.user) {
      let name = prompt("Please enter the preferred name for the route:");
      console.log(name, routeId, routeName, "received");
      Axios.defaults.withCredentials = true;
      Axios.post(
        API_URL + "/account/favorite/route",
        { route_id: routeId, name: name, route_name: routeName },
        { withCredentials: true }
      ).then((res) => {
        // update favourite routes
        let favoriteRoutes = this.state.favoriteRoutes;
        favoriteRoutes.push({
          route_id: routeId,
          name: name,
          route_name: routeName,
        });
        this.setState({
          favoriteRoutes: favoriteRoutes,
        });
        // update options
        this.updateFavouriteOptions();
      });
    }
  }

  removeFromFavouriteRoutes(routeId) {
    // remove route from favourite list
    if (this.state.user) {
      if (window.confirm("Do you really wish to remove this route?")) {
        Axios.defaults.withCredentials = true;
        Axios.post(
          API_URL + "/account/favorite/route",
          {
            route_id: routeId,
            action: "delete",
          },
          { withCredentials: true }
        ).then((fav) => {
          // update favorite route list
          let favoriteRoutes = this.state.favoriteRoutes;
          favoriteRoutes = favoriteRoutes.filter(
            (item) => item.route_id !== routeId
          );
          this.setState({
            favoriteRoutes: favoriteRoutes,
          });
          // go to users home page
          // update options
          this.updateFavouriteOptions();
        });
      }
    }
  }

  updateFavouriteOptions() {
    // update the select route options with favourites
    let favourites = this.state.favoriteRoutes.map((route) => {
      console.log(route);
      return {
        value: route.route_id,
        label: route.route_name + " \u{1F499}",
      };
    });

    // remove duplicate entries added through favourites
    let options = this.state.originalOptions;

    let favValues = favourites.map((fav) => fav.value);
    options = options.filter((item) => !favValues.includes(item.value));

    // update selected options
    this.setState({ selectOptions: favourites.concat(options) });
  }

  isFavoriteRoute(routeId) {
    // check if the route is a favourite route
    try {
      return (
        this.state.favoriteRoutes.filter((item) => item.route_id === routeId)
          .length === 1
      );
    } catch (e) {
      return false;
    }
  }

  render() {
    return (
      <>
        <input
          type="image"
          src="https://image.flaticon.com/icons/png/512/566/566004.png"
          width="40px"
          className="btn btn-link"
          data-toggle="collapse"
          data-target="#collapseControl"
          aria-expanded="true"
          aria-controls="collapseOne"
        ></input>
        <div className="collapse show container-fluid" id="collapseControl">
          <RoutesPlanner
            routeOptions={this.state.selectOptions}
            routes={this.state.routes}
            allStops={this.state.allStops}
            onRouteSelect={this.updateMap}
            onPredictionResult={this.handlePredictionResult}
            onCostResult={this.handleJourneyCost}
          />
          <br />
          <button
            id="resetButton"
            className="btn btn-light mb-3"
            onClick={() => window.location.reload(false)}
          >
            Clear selected route
          </button>

          {this.state.user && (
            <>
              {!this.isFavoriteRoute(this.state.selectedRouteId) && (
                <button
                  id="favoritesButton"
                  disabled={!this.state.selectedRoute}
                  className="btn btn-primary ml-1 mb-3"
                  onClick={() =>
                    this.addToFavouriteRoutes(
                      this.state.selectedRouteId,
                      this.state.selectedRouteName
                    )
                  }
                >
                  Add Route to Favourites
                </button>
              )}

              {this.isFavoriteRoute(this.state.selectedRouteId) && (
                <button
                  id="favoritesRemoveButton"
                  className="btn btn-primary ml-1 mb-3"
                  onClick={() =>
                    this.removeFromFavouriteRoutes(this.state.selectedRouteId)
                  }
                >
                  Remove Route from Favourites
                </button>
              )}
            </>
          )}

          {this.state.journeyCost && (
            <PredictionView
              predictCost={this.state.journeyCost}
              predictResult={this.state.predictionResult}
            />
          )}
        </div>

        {this.state.allStops &&
          this.state.routes &&
          this.state.allStopsKeys && (
            <GoogleMaps
              mapCenter={this.state.mapCenter}
              allStops={this.state.allStops}
              allStopsKeys={this.state.allStopsKeys}
              routes={this.state.routes}
              selectedRoute={this.state.selectedRoute}
              routeStart={this.state.routeStart}
              routeEnd={this.state.routeEnd}
              favoriteStops={this.state.favoriteStops}
              isFavoriteStop={this.isFavoriteStop}
              addToFavoriteStops={this.addToFavoriteStops}
              removeFavoriteStop={this.removeFavoriteStop}
              getFavoriteStopName={this.getFavoriteStopName}
            />
          )}

        {!this.state.allStops ||
          !this.state.routes ||
          (!this.state.allStopsKeys && (
            <div>
              Loading data, please wait ...
              <br />
              <img src={spinner} alt="" width="50" className="m-4" />
            </div>
          ))}
      </>
    );
  }
}

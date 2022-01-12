import React from "react";
import { API_URL } from "../config";
import { InfoWindow, Marker } from "@react-google-maps/api";
import "./TouristInfo.css";
import green_circle_icon from "../green_circle.png";
import favorite_icon from "../favorite.png";
import Axios from "axios";
import spinner from '../spinner.gif';

export default class TouristInfo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isInfoWindowOpen: false,
      selectedLocation: null,

      activitiesTags: [],
      attractionsTags: [],
      accommodationTags: [],

      selectedActivitiesTags: [],
      selectedAttractionsTags: [],
      selectedAccommodationTags: [],

      activitiesLocations: [],
      attractionsLocations: [],
      accommodationLocations: [],
      message: null,

      locations: [],
      favorites: [],

      fetching: false
    };

    this.onInfoWindowClose = this.onInfoWindowClose.bind(this);
    this.onMarkerClick = this.onMarkerClick.bind(this);
    this.selectActivities = this.selectActivities.bind(this);
    this.selectAttractions = this.selectAttractions.bind(this);
    this.selectAccommodation = this.selectAccommodation.bind(this);
    this.showActivities = this.showActivities.bind(this);
    this.showAttractions = this.showAttractions.bind(this);
    this.showAccommodation = this.showAccommodation.bind(this);
    this.updateLocations = this.updateLocations.bind(this);
    this.clearAll = this.clearAll.bind(this);
    this.addToFavorites = this.addToFavorites.bind(this);
    this.removeFavorite = this.removeFavorite.bind(this);
    this.isFavorite = this.isFavorite.bind(this);
  }

  componentDidMount() {
    // get the tourist info activities tags
    fetch(API_URL + "/tourist/activities/tags")
      .then((response) => response.json())
      .then((tags) => {
        this.setState({ activitiesTags: tags });
      });

    // get the tourist info attractions tags
    // fetch(API_URL+"/tourist/attractions/tags").then(response => response.json()).then(tags => {
    //    this.setState({ attractionsTags: tags });
    //});

    // get the tourist info accommodation tags
    fetch(API_URL + "/tourist/accommodation/tags")
      .then((response) => response.json())
      .then((tags) => {
        this.setState({ accommodationTags: tags });
      });

    // load favorites if signed in
    if (localStorage.getItem("user")) {
      // get list of favorite locations
      Axios.defaults.withCredentials = true;
      Axios.get(API_URL + "/account/favorite/", { withCredentials: true }).then(
        (fav) => {
          //console.log('getting favs')
          //console.log('got data', fav.data)
          const favList = fav.data.map((item) => ({
            latitude: item.fields.latitude,
            longitude: item.fields.longitude,
            name: item.fields.name,
            telephone: item.fields.telephone,
          }));
          //console.log(favList)
          this.setState({
            favorites: favList,
            locations: favList,
          });
        }
      );
    }
  }

  onInfoWindowClose() {
    // close the info window
    this.setState({
      isInfoWindowOpen: false,
      selectedLocation: null,
    });
  }

  onMarkerClick(locationId = 0, latitude, longitude) {
    // find selected location
    let q = "";
    if (latitude && longitude) {
      q = "?latitude=" + latitude + "&longitude=" + longitude;
    }
    fetch(API_URL + "/tourist/location/" + locationId + q)
      .then((response) => response.json())
      .then((data) => {
        this.setState({
          selectedLocation: data,
          isInfoWindowOpen: true,
          message: null,
        });
      });
  }

  showActivities() {
    // display tourist info activities locations
    let tags = this.state.selectedActivitiesTags.join(",");
    fetch(API_URL + "/tourist/activities/locations?tags=" + tags)
      .then((response) => response.json())
      .then((locations) => {
        this.setState({ activitiesLocations: locations }, () => {
          this.updateLocations();
        });
      });
  }

  showAttractions() {
    // display tourist info attractions locations
    let tags = this.state.selectedAttractionsTags.join(",");
    fetch(API_URL + "/tourist/attractions/locations?tags=" + tags)
      .then((response) => response.json())
      .then((locations) => {
        this.setState({ attractionsLocations: locations }, () => {
          this.updateLocations();
        });
      });
  }

  showAccommodation() {
    // display tourist info accommodation locations
    let tags = this.state.selectedAccommodationTags.join(",");
    fetch(API_URL + "/tourist/accommodation/locations?tags=" + tags)
      .then((response) => response.json())
      .then((locations) => {
        this.setState({ accommodationLocations: locations }, () => {
          this.updateLocations();
        });
      });
  }

  updateLocations() {
    // show locations on the map
    this.setState({
      locations: [
        ...this.state.attractionsLocations,
        ...this.state.activitiesLocations,
        ...this.state.accommodationLocations,
        ...this.state.favorites,
      ],
      fetching: false
    });
  }

  selectActivities(event) {
    // get checkbox value
    let value = event.target.value;
    // get selected tag list
    let selectedTags = this.state.selectedActivitiesTags;
    if (selectedTags.includes(value)) {
      selectedTags = selectedTags.filter((item) => item !== value);
    } else {
      selectedTags.push(value);
    }
    // update selected tag list
    this.setState(
      {
        selectedActivitiesTags: selectedTags,
        fetching: true
      },
      () => {
        // update map
        this.showActivities();
      }
    );
  }

  selectAttractions(event) {
    // get checkbox value
    let value = event.target.value;
    // get selected tag list
    let selectedTags = this.state.selectedAttractionsTags;
    if (selectedTags.includes(value)) {
      selectedTags = selectedTags.filter((item) => item !== value);
    } else {
      selectedTags.push(value);
    }
    // update selected tag list
    this.setState(
      {
        selectedAttractionsTags: selectedTags,
        fetching: true
      },
      () => {
        // update map
        this.showAttractions();
      }
    );
  }

  selectAccommodation(event) {
    // get checkbox value
    let value = event.target.value;
    // get selected tag list
    let selectedTags = this.state.selectedAccommodationTags;
    if (selectedTags.includes(value)) {
      selectedTags = selectedTags.filter((item) => item !== value);
    } else {
      selectedTags.push(value);
    }
    // update selected tag list
    this.setState(
      {
        selectedAccommodationTags: selectedTags,
        fetching: true
      },
      () => {
        // update map
        this.showAccommodation();
      }
    );
  }

  clearAll() {
    // remove all markers
    this.setState({
      locations: this.state.favorites,
      selectedActivitiesTags: [],
      selectedAttractionsTags: [],
      selectedAccommodationTags: [],
    });
    // deselect all checkboxes
    document
      .querySelectorAll('input[type=checkbox][class="form-check-input"]')
      .forEach((el) => (el.checked = false));
  }

  async addToFavorites() {
    if (localStorage.getItem("user")) {
      // add selected location to favorites
      Axios.defaults.withCredentials = true;
      Axios.post(
        API_URL + "/account/favorite/",
        {
          location: this.state.selectedLocation,
        },
        { withCredentials: true }
      )
        .then((res) => {
          // add location to favorite list
          let favList = this.state.favorites;
          favList.push(this.state.selectedLocation);
          // favorite saved
          this.setState({
            message: "Location saved to favourites",
            favorites: favList,
          });
        })
        .catch(() => {
          // cannot save favorite
          this.setState({ message: "Please sign in to save locations" });
        });
    } else {
      this.setState({ message: "Please sign in to save locations" });
    }
  }

  isFavorite(location) {
    // check if a location is in the favorite list
    let favList = this.state.favorites;
    const result = favList.filter(
      (item) =>
        item.latitude === location.latitude &&
        item.longitude === location.longitude
    );
    return result && result.length === 1;
  }

  removeFavorite(location) {
    // remove favorite from api
    if (window.confirm("Do you really wish to remove this location?")) {
      Axios.defaults.withCredentials = true;
      Axios.delete(
        API_URL +
          "/account/favorite/remove/" +
          location.latitude +
          "/" +
          location.longitude,
        { withCredentials: true }
      ).then((fav) => {
        let favList = this.state.favorites;
        favList = favList.filter(
          (item) =>
            item.latitude !== location.latitude &&
            item.longitude !== location.latitude
        );
        this.setState({
          favorites: favList,
          message: "Location removed from favourites",
        });
      });
    }
  }

  render() {
    // show or hide the floating menu on the map
    let style = { display: "none" };
    if (this.props.showMenu) {
      style = {};
    }

    // display a marker for each activity
    return (
      <>
        {this.state.locations.map((location, index) => {
          return (
            <Marker
              key={"location" + index}
              position={{
                lat: location.latitude,
                lng: location.longitude,
              }}
              onClick={() =>
                this.onMarkerClick(
                  location.id,
                  location.latitude,
                  location.longitude
                )
              }
              icon={{
                url: this.isFavorite(location)
                  ? favorite_icon
                  : green_circle_icon, // url
                scaledSize: new window.google.maps.Size(20, 20), // scaled size
                //origin: new window.google.maps.Point(0,0), // origin
                //anchor: new window.google.maps.Point(20, 35) // anchor
              }}
            />
          );
        })}

        {this.state.isInfoWindowOpen &&
          this.state.selectedLocation &&
          this.state.selectedLocation.latitude && (
            <InfoWindow
              position={{
                lat: this.state.selectedLocation.latitude,
                lng: this.state.selectedLocation.longitude,
              }}
              onCloseClick={this.onInfoWindowClose}
            >
              <div className="tourist-info">
                {this.state.selectedLocation.image && (
                  <img
                    alt=""
                    className="tourist-img"
                    src={this.state.selectedLocation.image}
                  />
                )}
                <h3>{this.state.selectedLocation.name}</h3>
                <div>{this.state.selectedLocation.description}</div>
                {this.state.selectedLocation.telephone && (
                  <div>Telephone: {this.state.selectedLocation.telephone}</div>
                )}
                {this.state.selectedLocation.full_address && (
                  <div>Address: {this.state.selectedLocation.full_address}</div>
                )}
                <div>
                  <a
                    href={this.state.selectedLocation.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit link
                  </a>
                </div>
                <div>
                  <button
                    className="btn btn-link"
                    onClick={() =>
                      this.props.stopsNearby(
                        this.state.selectedLocation.nearby_stops
                      )
                    }
                  >
                    Stops nearby
                  </button>

                  {!this.isFavorite(this.state.selectedLocation) && (
                    <button
                      className="btn btn-link"
                      onClick={this.addToFavorites}
                    >
                      Add to favourites
                    </button>
                  )}
                  {this.isFavorite(this.state.selectedLocation) && (
                    <button
                      className="btn btn-link"
                      onClick={() =>
                        this.removeFavorite(this.state.selectedLocation)
                      }
                    >
                      Remove favourite
                    </button>
                  )}

                  {this.state.message && <div>{this.state.message}</div>}
                </div>
              </div>
            </InfoWindow>
          )}

        <div
          id="tourist-info"
          className="floating-panel m-2 rounded"
          style={style}
        >
          <h6 className="p-1 text-primary">{this.state.fetching && <img src={spinner} alt="" className="mr-1" width="25" />}Activities</h6>
          <div className="form-group p-1 m-1 scrollable">
            {this.state.activitiesTags.map((tag, index) => {
              return (
                <div key={"a" + index} className="form-check">
                  <label>
                    <input
                      className="form-check-input"
                      value={tag.id}
                      type="checkbox"
                      onChange={this.selectActivities}
                    />
                    {tag.name}
                  </label>
                </div>
              );
            })}
          </div>

          <h6 className="p-1 text-primary" style={{ display: "none" }}>
            Attractions
          </h6>
          <div
            style={{ display: "none" }}
            className="form-group p-1 m-1 scrollable"
          >
            {this.state.attractionsTags.map((tag, index) => {
              return (
                <div key={"b" + index} className="form-check">
                  <label>
                    <input
                      className="form-check-input"
                      value={tag.id}
                      type="checkbox"
                      onChange={this.selectAttractions}
                    />
                    {tag.name}
                  </label>
                </div>
              );
            })}
          </div>

          <h6 className="p-1 text-primary">{this.state.fetching && <img src={spinner} alt="" className="mr-1" width="25" />}Accommodation</h6>
          <div className="form-group p-1 m-1 scrollable">
            {this.state.accommodationTags.map((tag, index) => {
              return (
                <div key={"c" + index} className="form-check">
                  <label>
                    <input
                      className="form-check-input"
                      value={tag.id}
                      type="checkbox"
                      onChange={this.selectAccommodation}
                    />
                    {tag.name}
                  </label>
                </div>
              );
            })}
          </div>

          <a className="btn btn-link" onClick={this.clearAll}>
            Clear all
          </a>
        </div>
      </>
    );
  }
}

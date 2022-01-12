import "./App.css";
import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

import { API_URL } from "./config";
import Cookies from "js-cookie";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";

import { Navbar, Nav } from "react-bootstrap";

import { LinkContainer } from "react-router-bootstrap";

import WeatherDisplay from "./components/WeatherDisplay.jsx";
import { About } from "./About";
import { Home } from "./Home";
import Search2 from "./Search2";
import Twitter from "./components/Twitter";
import { LogIn } from "./LogIn";

import Directions from "./components/Directions.jsx";

import UserHome from "./components/UserHome";
import Axios from "axios";
import logo from "./logo.png";
import GoToTopButton from "./components/GoToTopButton";

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      routes: {},
      allStops: {},
      allStopLocations: {},
      selectOptions: [],
      visibleStops: [],
      mapCenter: { lat: 53.344, lng: -6.267 }, // Dublin center,
      predictionResult: null,
      showStops: false, // show bus stop markers
      user: null, // authenticated user
    };

    this.updateMap = this.updateMap.bind(this);
    this.handlePredictionResult = this.handlePredictionResult.bind(this);
    this.setUser = this.setUser.bind(this);
  }

  componentDidMount() {
    Axios.get(API_URL + "/stops")
      .then((response) => response.data)
      .then((stops) => {
        // store stops in state
        this.setState({ allStopsKeys: Object.keys(stops), allStops: stops });
      });

    Axios.get(API_URL + "/locations")
      .then((response) => response.data)
      .then((locations) => {
        // store stop locations in state
        this.setState({ allStopLocations: locations });
      });

    // get user from local storage
    let user = localStorage.getItem("user");
    if (user) {
      user = JSON.parse(user);
      this.setState({
        user: user,
      });
    }
  }

  setUser(user) {
    // save the authenticated user to state
    this.setState({
      user: user,
    });
  }

  updateMap(selectedOption) {
    console.log("new route selected");
    // update the map when a route is selected from the Routes Planner
    // find the selected route (selectedOption.value)
    let route = this.state.routes[selectedOption.value];
    // update visible stops with the selected stops, center map on first stop
    this.setState({
      selectedRoute: route,
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
    // the prediction result comes out from the Routes Planner into this function
    // send the route start and end to the map
    console.log("prediction response received: " + response.data);
    this.setState({
      predictionResult: response.data,
      routeStart: routeStart,
      routeEnd: routeEnd,
    });
  }

  render() {
    return (
      <div className="App">
        <GoToTopButton/>
        <Router forceRefresh={true}>
          <Navbar collapseOnSelect expand="md" bg="light">
            <Navbar.Brand href="#home">
              <img src={logo} width="105px" alt="brandPic" />
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="responsive-navbar-nav" />
            <Navbar.Collapse id="responsive-navbar-nav">
              <Nav className="mr-auto">
                <LinkContainer to="/">
                  <Nav.Link>Home</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/search">
                  <Nav.Link>Routes</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/info">
                  <Nav.Link>Planner</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/about">
                  <Nav.Link>Meet the team</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/twitter">
                  <Nav.Link>Updates</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/user">
                  <Nav.Link>
                    {!this.state.user && "Log In"}
                    {this.state.user && "User"}
                  </Nav.Link>
                </LinkContainer>
                {this.state.user && (
                  <LinkContainer to="/logout">
                    <Nav.Link>Logout</Nav.Link>
                  </LinkContainer>
                )}
              </Nav>

              <Nav className="justify-content-end">
                <Nav.Item>
                  <WeatherDisplay />
                </Nav.Item>
              </Nav>
            </Navbar.Collapse>
          </Navbar>

          <div>
            {" "}
            {/* add padding here*/}
            <Switch>
              <Route exact path="/">
                <Home />
              </Route>
              <Route path="/about">
                <About />
              </Route>
              <Route path="/info">
                <Directions locations={this.state.allStopLocations} />
              </Route>
              <Route path="/search">
                <Search2 />
              </Route>
              <Route path="/twitter">
                <Twitter />
              </Route>
              <Route path="/user">
                {!this.state.user && <LogIn success={this.setUser} />}
                {this.state.user && <UserHome user={this.state.user} />}
              </Route>
              <Route path="/logout">
                <LogOut user={this.state.user} success={this.setUser} />
              </Route>
            </Switch>
          </div>
        </Router>
      </div>
    );
  }
}

function LogOut(props) {
  // simple logout, remove user from App, redirect to login page
  localStorage.removeItem("user");
  if (props.user) {
    Axios.defaults.withCredentials = true;
    Axios.get(API_URL + "/account/logout/", { withCredentials: true }).then(
      (fav) => {
        Cookies.remove("sessionid");
        props.success(null);
        // remove axios credentials
        delete Axios.defaults.headers.common["Authorization"];
      }
    );
  }
  return <Redirect to="/user" />;
}

import { Component } from "react";
import Select from "react-select";
import Axios from "axios";
import { API_URL } from "../config";
import TimePicker from "./TimePicker.jsx";
import spinner from "../spinner.gif";

import "./RoutesPlanner.css";

export default class RoutesPlanner extends Component {
  constructor(props) {
    super(props);
    this.state = {
      routes: {},
      allStops: {},
      //These states are used for the start and stop station selection
      selectStops: {},
      //predictStops: null,
      startSelectOptions: [],
      endSelectOptions: [],
      routeLoaded: false,

      // used to prevent the user from hitting the predict button until a route has been chosen
      routeChosen: false,

      // These states are used to store the information used in the prediction
      predictTime: new Date(),
      currentRoute: null,
      routeStart: null,
      routeEnd: null,

      cash: true,
      adults: 1,
      children: 0,
      journeyCost: 0,
      journeyButtonPressed: false,
    };

    this.selectRoute = this.selectRoute.bind(this);
    this.selectStartPoint = this.selectStartPoint.bind(this);
    this.selectEndPoint = this.selectEndPoint.bind(this);
    this.handleDateTime = this.handleDateTime.bind(this);
    this.predictSender = this.predictSender.bind(this);

    this.cardActive = this.cardActive.bind(this);
    this.cashActive = this.cashActive.bind(this);
  }

  selectRoute(selectedOption) {
    // show the stops on the current route and allow the user to pick one
    // Gets the list of stops based in the current route (In order, data used for the map markers was not in order)
    let currentRouteStops = this.props.routes[selectedOption.value];
    // Avoid unexpected errors
    if (!currentRouteStops) return;
    let routeStops = currentRouteStops.map((stop) => {
      return {
        value: stop,
        label: this.props.allStops[stop].stop_name,
      };
    });

    this.setState({
      routeStops: routeStops,
      startSelectOptions: routeStops,
      endSelectOptions: routeStops,
      selectedRouteName: selectedOption.label,
      currentRoute: selectedOption.value,
      routeStart: null,
      routeEnd: null,
      routeChosen: false,
    });

    // update Google Maps from Routes Planner
    this.props.onRouteSelect(selectedOption);

    try {
      // reset text shown in select start
      let select1 = document.getElementById("startStation"),
        d2 = select1.getElementsByTagName("div")[0],
        d3 = d2.getElementsByTagName("div")[0],
        d4 = d3.getElementsByTagName("div")[0];
      d4.innerHTML = "Select departure stop";

      // reset text shown in select end
      let select2 = document.getElementById("endStation"),
        d5 = select2.getElementsByTagName("div")[0],
        d6 = d5.getElementsByTagName("div")[0],
        d7 = d6.getElementsByTagName("div")[0];
      d7.innerHTML = "Select arrival stop";
    } catch (e) {
      console.log(e);
    }
  }

  selectStartPoint(selectedOption) {
    // Gets the list of current stops on the route
    let stop_list = this.state.routeStops;
    // get the index of the first stop
    let json_index = stop_list
      .map((obj) => obj.value)
      .indexOf(selectedOption.value);
    // this.setState({ predictStops: (stop_list.slice(json_index)) });
    // used to store the available stops on the route
    let secondOptions = stop_list.slice(json_index + 1);
    // set the options for the stop destination equal to the second options
    this.setState({
      endSelectOptions: secondOptions,
      routeLoaded: true,
      routeStart: selectedOption["value"],
    });
  }

  selectEndPoint(selectedOption) {
    // update startSelectOptions based on end point selection
    let stop_list = this.state.routeStops;
    // get the index of the last stop
    let json_index = stop_list
      .map((obj) => obj.value)
      .indexOf(selectedOption.value);
    // used to store the available stops on the route
    let firstOptions = stop_list.slice(0, json_index);
    // update start options based on end options
    this.setState({
      startSelectOptions: firstOptions,
      routeEnd: selectedOption["value"],
      routeChosen: true,
    });
  }

  // Assigns the stop_station value to the routeEnd state when the second select option is selected
  handleDateTime(current) {
    this.setState({ predictTime: current });
  }

  //Async here allows for the await in the function body
  async predictSender() {
    // set journey button pressed to true
    this.setState({
      journeyButtonPressed: true,
    });
    // request prediction
    let predictTime = this.state.predictTime;
    // This await makes the function wait until bus_fare_calculator is finished
    let journeyCost = await this.bus_fare_calculator();
    // this passes the value to search2.js
    this.props.onCostResult(journeyCost);

    // Send the values to predict url (which is the predict getter function in utils.py)
    Axios.post(
      API_URL + `/predict`,
      {
        predictTime: predictTime,
        route_id: this.state.currentRoute,
        start_station: this.state.routeStart,
        stop_station: this.state.routeEnd,
      },
      {
        headers: {
          // not entirely sure what authorization key is but i think we can set it up at some point in the future?
          Authorization: `AuthKey`,
          "Content-Type": "application/json",
        },
      }
    )
      .then((res) => {
        console.log(res);
        // send prediction result to App
        this.props.onPredictionResult(
          res,
          this.state.routeStart,
          this.state.routeEnd
        );
        // set journey button pressed to false
        this.setState({
          journeyButtonPressed: false,
        });
      })
      .catch((error) => {
        console.error(error);
        // set journey button pressed to false
        this.setState({
          journeyButtonPressed: false,
        });
      });
    // in case something goes wrong
    // this.props.onPredictionResult({data:'json prediction not available'}, this.state.routeStart, this.state.routeEnd);
  }

  // Async function to calculate then return the bus fare
  // Async cause otherwise the default value is sent before the calculation is done
  async bus_fare_calculator() {
    // number of adults & children
    var adults = this.state.adults;
    var children = this.state.children;

    // Variables used to store if the route is express, is during school time fares,
    var express = false;
    var isSchool = false;
    var currentRouteShort = this.state.currentRoute.split(" ")[0];

    //Gets the payment method
    let payMethod = "Cash";
    if (!this.state.cash) {
      payMethod = "Card";
    }
    /*Dictionary with costs in cash and card for adult
      1 Stage 1-3
      2 Stage 4-13
      3 Stage 13+
      4 Xpresso
      */
    var costAdult = {
      1: { Cash: 2.15, Card: 1.55 },
      2: { Cash: 3.0, Card: 2.25 },
      3: { Cash: 3.3, Card: 2.5 },
      4: { Cash: 3.8, Card: 3.0 },
    };
    /*
      Dictionary with costs in cash and card for Child
       1 School fare Monday-Friday untill 19.00hr and Until 13.30hrs on Saturday
       2 Stage 1-7
       3 Stage 7+
       4 Xpresso
       */
    var costChild = {
      1: { Cash: 1.0, Card: 0.8 },
      2: { Cash: 1.3, Card: 1.0 },
      3: { Cash: 1.0, Card: 1.3 },
      4: { Cash: 1.6, Card: 1.26 },
    };

    //Stores the price for Adult and Child, will be multipled by the amount of each
    var priceForAdult;
    var priceForChild;

    //Get the index of the starting and ending stops (to get the overall amount of stops)
    let startIndex;
    let endIndex;

    // Iterate through the routeStops, if the stop is either the start or the end save the index to the variables above
    for (var i = 0; i < Object.keys(this.state.routeStops).length; i++) {
      if (this.state.routeStops[i].value === this.state.routeStart) {
        startIndex = i;
      }
      if (this.state.routeStops[i].value === this.state.routeEnd) {
        endIndex = i;
      }
    }
    // Get the number of stops by slicing the routeStops at the indexes and getting the length
    let numberOfStops = Object.keys(
      this.state.routeStops.slice(startIndex, endIndex)
    ).length;
    //Checks if the current route is express (express is a flat fare)
    if (
      currentRouteShort[currentRouteShort.length - 1] === "X" ||
      currentRouteShort === "51D" ||
      currentRouteShort === "33D"
    ) {
      express = true;
    }
    //Checks if the predict time is within the School fare time window (Sunday is 0 in javascript, because javascript)
    var day = this.state.predictTime.getDay();
    var hours = this.state.predictTime.getHours();
    var minutes = this.state.predictTime.getMinutes();
    switch (day > 0 && day < 5) {
      case true:
        if (hours <= 19) {
          isSchool = true;
        }
        break;
      case false:
        if (day === 6) {
          if (hours < 13 || (hours === 13 && minutes <= 30)) {
            isSchool = true;
            break;
          }
        }
    }
    //If the route is express, just set the prices to the express fare
    if (express) {
      priceForAdult = costAdult[4][payMethod];
      priceForChild = costChild[4][payMethod];
    } else {
      //Switch statement that evaluates if the following expression are true
      switch (true) {
        case numberOfStops <= 3:
          priceForAdult = costAdult[1][payMethod];
          priceForChild = costChild[2][payMethod];
          break;
        case numberOfStops <= 7:
          priceForAdult = costAdult[2][payMethod];
          priceForChild = costChild[2][payMethod];
          break;
        case numberOfStops <= 13:
          priceForAdult = costAdult[2][payMethod];
          priceForChild = costChild[3][payMethod];
          break;
        case numberOfStops > 13:
          priceForAdult = costAdult[3][payMethod];
          priceForChild = costChild[3][payMethod];
          break;
      }
    }

    // if it is school time set the child fare to the flat school rate
    if (isSchool) {
      priceForChild = costChild[1][payMethod];
    }
    //console.log("Adult price",priceForAdult,"Child Price",priceForChild);

    // Calculate the cost per adult by the amount of adults, same for children
    let finalCost = priceForChild * children + priceForAdult * adults;
    //Return it rounded to two decimal places (prevents long floats from displaying)
    return finalCost.toFixed(2);
  }

  // These two functions activate with the Onchange in the Cash/Card radio buttons, update the cash state
  cashActive() {
    this.setState({ cash: true });
  }
  cardActive() {
    this.setState({ cash: false });
  }

  //These two functions update the adults and children state with the current value in the input boxes
  updateAdults(evt) {
    this.setState({
      adults: evt.target.value,
    });
  }
  updateChildren(evt) {
    this.setState({
      children: evt.target.value,
    });
  }
  render() {
    return (
      <>
        <div className="row">
          <div className="col-md-6">
            <div className="form-group">
              <label>Bus Routes</label>
              <Select
                options={this.props.routeOptions}
                onChange={this.selectRoute}
                value={this.props.routeOptions.filter((option) => {
                  if (this.state.selectedRouteName) {
                    // find the selected item, ignore the heart icon
                    return (
                      option.label.replace(" \u{1F499}", "") ===
                      this.state.selectedRouteName.replace(" \u{1F499}", "")
                    );
                  }
                })}
                placeholder={"Select route"}
              />
            </div>
          </div>
          <div className="col-md-3">
            <div className="form-group">
              <label>Departure bus stop</label>
              <Select
                id="startStation"
                options={this.state.startSelectOptions}
                onChange={this.selectStartPoint}
                defaultValue={{ label: "Select departure stop", value: null }}
              ></Select>
            </div>
          </div>
          <div className="col-md-3">
            <div className="form-group">
              <label>Arrival bus stop</label>
              <Select
                id="endStation"
                options={this.state.endSelectOptions}
                defaultValue={{ label: "Select arrival stop", value: null }}
                onChange={this.selectEndPoint}
              ></Select>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-2">
            <p>Depart at:</p>
          </div>
          <div className="col-md-3">
            <div className="form-group">
              <TimePicker update={this.handleDateTime} />
            </div>
          </div>
          <div className="col-md-4">
            <label htmlFor="adults">Adults:</label>
            <input
              type="number"
              id="adults"
              name="adults"
              min="0"
              max="10"
              value={this.state.adults}
              onChange={(evt) => this.updateAdults(evt)}
            ></input>
            <label htmlFor="children">Children(Age 5+):</label>
            <input
              htmltype="number"
              id="children"
              name="children"
              min="0"
              max="10"
              value={this.state.children}
              onChange={(evt) => this.updateChildren(evt)}
            ></input>
          </div>
          <div className="col-md-2">
            <input
              type="radio"
              id="Cash"
              name="PaymentType"
              value="Cash"
              onClick={this.cashActive}
              defaultChecked="checked"
            ></input>
            <label htmlFor="Cash">Cash</label>
            <input
              type="radio"
              id="Card"
              name="PaymentType"
              value="Card"
              onClick={this.cardActive}
            ></input>
            <label htmlFor="Card">Leap Card</label>
          </div>
          <div className="col-md-12">
            <button
              id="predictButton"
              className="btn btn-primary"
              onClick={this.predictSender}
              disabled={!this.state.routeChosen}
            >
              {this.state.journeyButtonPressed && (
                <>
                  <img
                    src={spinner}
                    width="20px"
                    alt=""
                    className="mr-2 mb-1"
                  />{" "}
                  Calculating Journey Time
                </>
              )}
              {!this.state.journeyButtonPressed && "Get travel duration"}
            </button>
          </div>
          <div></div>
        </div>
      </>
    );
  }
}

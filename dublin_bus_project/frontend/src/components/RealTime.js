import React from "react";
import { API_URL } from "../config";
import "./RealTime.css";

export default class Timetable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      stop: props.stop,
      timetable: [],
    };
  }

  componentDidMount() {
    // receive the bus stop from GoogleMaps component
    let stop = this.props.stop;
    let now = new Date().getTime();

    // fetch timetable with the stop id as an argument
    fetch(API_URL + "/timetable/" + stop.stop_id)
      .then((response) => response.json())
      .then((trips) => {
        //Limit and count used to only add maximum of 10 rows of information, increase limit to allow for rows
        let limit = 10;
        let count = 0;
        // Array used to store series of key:value pairs
        var times = [];
        trips.map((trip) => {
          //Declare value (will be used to store the due times)
          var value;
          let busNumber = trip["bus_number"];
          let time = new Date(trip["arrival_time"]);
          // If the bus is due in less than one minute, set the value to now
          if (time - now < 1000 * 60) {
            value = "Now";
          } else {
            //Else set it to the time it is due, and get the difference between now and then in minutes
            value =
              time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }) +
              " (" +
              Math.floor((time - now) / 60000) +
              " mins)";
          }
          // if count is less than the limit add a key value pair with the number and the due time to the times array
          if (count < limit) {
            times.push({ number: busNumber, due: value });
            count++;
          }
        });
        // add times array to timetable as a state
        this.setState({ timetable: times });
      });
  }

  //Function that is used to populate the row
  rowfiller() {
    //Count used to make key unique in case of two buses with same ID and arrival time
    // Needs unique key to avoid throwing a warning/error
    let count = 0;
    // if the timetable is empty
    if (this.state.timetable.length < 1) {
      return (
        <tr>
          <td>Sorry!</td>
          <td>No info available</td>
        </tr>
      );
    } else {
      // For every entry in the timtable
      //create a row with the name and due time
      return this.state.timetable.map((entry) => {
        let key = entry["number"] + entry["due"] + count.toString();
        count++;
        return (
          <tr key={key}>
            <td className="tableBusName">{entry["number"]}</td>
            <td className="tableDueDate">{entry["due"]}</td>
          </tr>
        );
      });
    }
  }

  render() {
    // Split the route name
    var name = this.props.stop.stop_name.split(",");
    //Display is the stops name, stopID is the stop number
    var display = name[0];
    var stopid = name[1];
    // Return a table, rows populated by calling rowfiller() function
    return (
      <div className="timetable-info">
        <h3>
          {display}
          <br />
          {stopid}
        </h3>
        <div>
          <table id="timeTableDisplay">
            <tbody>
              <tr>
                <th className="tableBusName">Bus</th>
                <th className="tableDueDate">Due</th>
              </tr>
              {this.rowfiller()}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

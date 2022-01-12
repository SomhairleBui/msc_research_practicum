import React from "react";
import Axios from "axios";
import { API_URL } from "../config";
import icon from "../images/favIcon2.png";
import { LinkContainer } from "react-router-bootstrap";

export default class FavStops extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      favorites: [],
      timetable: [],
      currentStopId: null,
      buttonText: "Show Real-Time Information",
    };
  }

  componentDidMount() {
    // get list of favorite locations
    Axios.defaults.withCredentials = true;
    Axios.get(API_URL + "/account/favorite/stops", { withCredentials: true })
      .then((fav) => {
        //console.log('got data', fav.data)
        this.setState({
          favorites: fav.data,
        });
      })
      .catch(() => {});
  }

  removeFavorite(stop_id) {
    // remove favorite from api
    window.confirm("Do you really wish to remove this stop?") &&
      Axios.delete(API_URL + "/account/favorite/stop/" + stop_id, {
        withCredentials: true,
      }).then((fav) => {
        let favList = this.state.favorites;
        favList = favList.filter((item) => item.stop_id !== stop_id);
        this.setState({
          favorites: favList,
        });
      });
  }

  buttonTexter(stop_id) {
    if (this.state.currentStopId == stop_id) {
      return "Hide Real-Time Information";
    } else {
      return "Show Real-Time Information";
    }
  }
  handleClicker(stop_id) {
    if (this.state.currentStopId != stop_id) {
      this.showTimetable(stop_id);
      this.setState({ currentStopId: stop_id });
    } else {
      this.setState({ currentStopId: null });
    }
  }
  showTimetable(stop_id) {
    let now = new Date().getTime();
    fetch(API_URL + "/timetable/" + stop_id)
      .then((response) => response.json())
      .then((trips) => {
        let limit = 10;
        let count = 0;
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
    return (
      <>
        <h4 className="m-3">
          <img src={icon} alt="" width="25" className="mb-2 mr-2" />
          Favourite stops
        </h4>
        {this.state.favorites.length === 0 && (
          <p>Currently there are no favourite stops saved in your account.</p>
        )}
        {this.state.favorites.length !== 0 && (
          <p>
            You can see your favourite stops on the Map in{" "}
            <LinkContainer to="/search">
              <a className="btn-link">Routes page</a>
            </LinkContainer>
            .
          </p>
        )}

        <div>
          {this.state.favorites.map((fav, index) => {
            return (
              <div key={"fav" + index} className="row rounded m-3 bg-light">
                <div className="col m-2">
                  {fav.name && <h6 className="text-info">{fav.name}</h6>}
                  <h6>{fav.stop_name}</h6>
                  <div>
                    <button
                      onClick={() => this.handleClicker(fav.stop_id)}
                      className="btn btn-link mb-1"
                    >
                      {this.buttonTexter(fav.stop_id)}
                    </button>
                    {this.state.currentStopId == fav.stop_id && (
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
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => this.removeFavorite(fav.stop_id)}
                      className="btn btn-link mb-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }
}

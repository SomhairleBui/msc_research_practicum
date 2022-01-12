import React from "react";
import FavLocations from "./FavLocations";
import FavStops from "./FavStops";
import { LinkContainer } from "react-router-bootstrap";
import Axios from "axios";
import { API_URL } from "../config";
import Cookies from "js-cookie";
import FavRoutes from "./FavRoutes";
import userIcon from "../user.png";

export default class UserHome extends React.Component {
  constructor(props) {
    super(props);

    this.deleteAccount = this.deleteAccount.bind(this);
  }

  deleteAccount() {
    // remove the user account
    localStorage.removeItem("user");
    Axios.defaults.withCredentials = true;
    Axios.delete(API_URL + "/account/remove", { withCredentials: true }).then(
      (fav) => {
        Cookies.remove("sessionid");
        // remove axios credentials
        delete Axios.defaults.headers.common["Authorization"];
        // redirect to user home
        window.location = "/user";
      }
    );
  }

  render() {
    return (
      <>
        <h3 className="m-3">Welcome {this.props.user.username}!</h3>

        <nav>
          <div className="nav nav-tabs" id="nav-tab" role="tablist">
            <a
              className="nav-item nav-link active"
              id="nav-routes-tab"
              data-toggle="tab"
              href="#nav-routes"
              role="tab"
              aria-controls="nav-routes"
              aria-selected="true"
            >
              Routes
            </a>
            <a
              aria-selected="true"
              className="nav-item nav-link"
              id="nav-stops-tab"
              data-toggle="tab"
              href="#nav-stops"
              role="tab"
              aria-controls="nav-stops"
              aria-selected="false"
            >
              Stops
            </a>
            <a
              className="nav-item nav-link"
              id="nav-locations-tab"
              data-toggle="tab"
              href="#nav-locations"
              role="tab"
              aria-controls="nav-locations"
              aria-selected="false"
            >
              Locations
            </a>
            <a
              className="nav-item nav-link"
              id="nav-settings-tab"
              data-toggle="tab"
              href="#nav-settings"
              role="tab"
              aria-controls="nav-settings"
              aria-selected="false"
            >
              Settings
            </a>
          </div>
        </nav>

        <div className="tab-content" id="nav-tabContent">
          <div
            className="tab-pane fade show active"
            id="nav-routes"
            role="tabpanel"
            aria-labelledby="nav-routes-tab"
          >
            <FavRoutes />
          </div>
          <div
            className="tab-pane fade show"
            id="nav-stops"
            role="tabpanel"
            aria-labelledby="nav-stops-tab"
          >
            <FavStops />
          </div>
          <div
            className="tab-pane fade"
            id="nav-locations"
            role="tabpanel"
            aria-labelledby="nav-locations-tab"
          >
            <FavLocations />
          </div>

          <div
            className="tab-pane fade"
            id="nav-settings"
            role="tabpanel"
            aria-labelledby="nav-settings-tab"
          >
            <h4 className="m-3">
              <img src={userIcon} width="30px" alt="" className="mb-2" />{" "}
              Account settings
            </h4>
            <div className="alert alert-danger" role="alert">
              Warning! This operation cannot be undone.
            </div>
            <div>
              <button
                className="btn btn-danger"
                onClick={(e) =>
                  window.confirm(
                    "Are you sure you wish to delete your account?"
                  ) && this.deleteAccount()
                }
              >
                Click here delete your account
              </button>
            </div>
          </div>
        </div>

        <LinkContainer to="/search">
          <button className="btn mb-3 btn-link">Go to Routes</button>
        </LinkContainer>
      </>
    );
  }
}

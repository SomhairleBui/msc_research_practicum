import React from "react";
import Axios from "axios";
import { API_URL } from "../config";
import { LinkContainer } from "react-router-bootstrap";

export default class FavRoutes extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      favorites: [],
    };
  }

  componentDidMount() {
    // get list of favorite routes
    Axios.defaults.withCredentials = true;
    Axios.get(API_URL + "/account/favorite/routes", { withCredentials: true })
      .then((fav) => {
        //console.log('got data', fav.data)
        this.setState({
          favorites: fav.data,
        });
      })
      .catch(() => {});
  }

  removeFavorite(route_id) {
    // remove favorite from api
    window.confirm("Do you really wish to remove this route?") &&
      Axios.post(
        API_URL + "/account/favorite/route",
        {
          route_id: route_id,
          action: "delete",
        },
        { withCredentials: true }
      ).then((fav) => {
        let favList = this.state.favorites;
        favList = favList.filter((item) => item.route_id !== route_id);
        this.setState({
          favorites: favList,
        });
      });
  }

  render() {
    return (
      <>
        <h4 className="m-3">&#128153; Favourite routes</h4>
        {this.state.favorites.length === 0 && (
          <p>Currently there are no favourite routes saved in your account.</p>
        )}
        {this.state.favorites.length !== 0 && (
          <p>
            You can see your favourite routes in 'Select Route' in{" "}
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
                  <h6>{fav.route_name}</h6>
                  <div>
                    <button
                      onClick={() => this.removeFavorite(fav.route_id)}
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

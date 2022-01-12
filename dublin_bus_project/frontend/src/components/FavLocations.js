import React from "react";
import Axios from "axios";
import { API_URL } from "../config";
import icon from "../favorite.png";
import { LinkContainer } from "react-router-bootstrap";

export default class FavLocations extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      favorites: [],
    };
  }

  componentDidMount() {
    // get list of favorite locations
    Axios.defaults.withCredentials = true;
    Axios.get(API_URL + "/account/favorite/", { withCredentials: true })
      .then((fav) => {
        //console.log('got data', fav.data)
        this.setState({
          favorites: fav.data,
        });
      })
      .catch(() => {});
  }

  removeFavorite(pk) {
    // remove favorite from api
    window.confirm("Do you really wish to remove this location?") &&
      Axios.delete(API_URL + "/account/favorite/" + pk, {
        withCredentials: true,
      }).then((fav) => {
        let favList = this.state.favorites;
        favList = favList.filter((item) => item.pk !== pk);
        this.setState({
          favorites: favList,
        });
      });
  }

  render() {
    return (
      <>
        <h4 className="m-3">
          <img src={icon} alt="" width="30" className="mb-2 mr-2" />
          Favourite locations
        </h4>
        {this.state.favorites.length === 0 && (
          <p>
            Currently there are no favourite locations saved in your account.
          </p>
        )}
        {this.state.favorites.length !== 0 && (
          <p>
            You can see your favourite locations on the Map in{" "}
            <LinkContainer to="/search">
              <a className="btn-link">Routes page</a>
            </LinkContainer>
            .
          </p>
        )}

        <div className="container">
          {this.state.favorites.map((fav, index) => {
            return (
              <div key={"fav" + index} className="row rounded m-3 bg-light">
                <div className="col-sm-4">
                  {fav.fields.image && (
                    <img
                      alt=""
                      className="tourist-img m-3"
                      src={fav.fields.image}
                    />
                  )}
                  {!fav.fields.image && (
                    <img
                      alt=""
                      className="tourist-img m-3"
                      src="https://failtecdn.azureedge.net/failteireland/F%C3%A1ilte_Ireland_Logo_OpenDataAPI.jpg"
                    />
                  )}
                </div>

                <div className="col-sm-8">
                  <div className="text-left m-3">
                    <h6>{fav.fields.name}</h6>
                    <div>{fav.fields.description}</div>
                    {fav.fields.telephone && (
                      <div>Telephone: {fav.fields.telephone}</div>
                    )}
                    {fav.fields.address && (
                      <div>Address: {fav.fields.address}</div>
                    )}
                    <div>
                      <button
                        onClick={() => this.removeFavorite(fav.pk)}
                        className="btn btn-link"
                      >
                        Remove
                      </button>
                      <a
                        href={fav.fields.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-link"
                      >
                        Visit link
                      </a>
                    </div>
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

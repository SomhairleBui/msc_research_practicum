import React from "react";
import { Dropdown, DropdownButton, Row, Col } from "react-bootstrap";
import { API_URL } from "../config";

export default class WeatherDisplay extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      temp: null,
      feels: null,
      max: null,
      min: null,
      humid: null,
      desc: null,
      icon: null,
      error: false,
      isLoaded: false,
    };
  }

  componentDidMount() {
    this._getData();
    this.interval = setInterval(() => {
      this.setState({ error: false, isloaded: false });
      this._getData();
    }, 300000); // 5 mins
  }

  _getData = async (e) => {
    await fetch(API_URL + "/weather")
      .then((response) => response.json())
      .then(
        (result) => {
          this.setState({
            isLoaded: true,
            temp: result["temp"],
            feels: result["feels_like"],
            humid: result["humidity"] + "%",
            desc: result["weather_desc"],
            icon: "http://openweathermap.org/img/w/" + result["icon"] + ".png",
          });
        },

        (error) => {
          this.setState({
            isLoaded: true,
            error,
          });
        }
      );
  };

  render() {
    if (this.state.error) {
      return <div>No Weather Data</div>;
    } else if (!this.state.isLoaded) {
      return <div>Loading...</div>;
    } else {
      return (
        <Row>
          <Col>
            <img
              src={this.state.icon}
              alt="Icon showing the current weather forecast"
            />
          </Col>
          <Col>
            <DropdownButton
              variant="Info"
              id="weather-more"
              title={`Current: ${this.state.temp} °C`}
            >
              <Dropdown.Item>Feels like: {this.state.feels}°C</Dropdown.Item>
              <Dropdown.Item>Humidty: {this.state.humid}</Dropdown.Item>
            </DropdownButton>
          </Col>
        </Row>
      );
    }
  }
}

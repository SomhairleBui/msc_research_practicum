import fetchMock from "fetch-mock-jest";
import WeatherDisplay from "../components/WeatherDisplay";
import waitUntil from "async-wait-until";
import { shallow, configure } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { API_URL } from "../config";

configure({ adapter: new Adapter() });

describe("<WeatherDisplay/>", () => {
  // set up mock APIs
  beforeAll(() => {

    // create mock APIs
    fetchMock.get(API_URL + "/weather", {"id": 147, "future_dt": "2021-08-19T16:16:25Z", "temp": 18.79, "feels_like": 19.0, "pressure": 1010.0, "humidity": 87, "wind_speed": 2.68, "wind_deg": 141, "clouds": 75, "weather_main": "Drizzle", "weather_desc": "light intensity drizzle", "rain_bool": 1, "icon": "09d"});


  });

  // test component
  it("Weather state", async () => {
      const t = shallow(<WeatherDisplay />);
      // call componentDidMount
      await t.instance().componentDidMount();

      await waitUntil(() => {
        return t.state("isLoaded")
      });

      if((!t.state('temp') &&
          t.state('max') &&
          t.state('min') &&
          t.state('humid') &&
          t.state('icon') &&
          t.state('desc'))){
            throw Error('weather fetch failed');
        }
  });
});
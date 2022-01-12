import fetchMock from "fetch-mock-jest";
import waitUntil from "async-wait-until";
import { shallow, configure } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { API_URL } from "../config";
import GoogleMaps from "../components/GoogleMaps";
import React from "react";

configure({ adapter: new Adapter() });

describe("<Search2/>", () => {
  // set up mock APIs
  beforeAll(() => {

      fetchMock.get(API_URL + "/real_time", [{
          "id": 563358,
          "stop_id": "226",
          "trip_id": "5020.y1007.60-1-d12-1.1.O",
          "arrival_time": 1629481440000
      }]);

  });
  // test component
  it("GoogleMaps state", async () => {
      const t = shallow(<GoogleMaps favoriteStops={[]} />);
      // call componentDidMount
      await t.instance().componentDidMount();

      await waitUntil(() => {
        return t.state("trips").length !== 0;
      });

    // expect 1 trip
    expect(t.state("trips").length).toBe(1);

  });
});
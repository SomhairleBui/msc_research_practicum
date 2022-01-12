import fetchMock from "fetch-mock-jest";
import waitUntil from "async-wait-until";
import { shallow, configure } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { API_URL } from "../config";
import RoutesPlanner from "../components/RoutesPlanner";
import React from "react";

configure({ adapter: new Adapter() });

describe("<RoutesPlanner/>", () => {
  let allStops = {
      "381": {
        "stop_id": "381",
        "stop_name": "Parnell Square West, stop 2",
        "stop_lat": 53.3522443611407,
        "stop_lon": -6.26372321891882
      },
      "7740": {
        "stop_id": "7740",
        "stop_name": "Parnell Square West, stop 3",
        "stop_lat": 53.3523085514349,
        "stop_lon": -6.26381074216821
      },
      "7741": {
        "stop_id": "7741",
        "stop_name": "Parnell Square West, stop 4",
        "stop_lat": 53.3525745131874,
        "stop_lon": -6.26417548603793
      }};

  let routes = {
        "1 Inbound,Shanard Road (Shanard Avenue) - Saint John's Church,60-1-d12-1,3,1": [ "381", "7740", "7741"]
    };

  const options = [
      {
          label: "1 Inbound,Shanard Road (Shanard Avenue)",
          value: "1 Inbound,Shanard Road (Shanard Avenue)"
      },
      {
          label: "2 Inbound,Shanard Road (Shanard Avenue)",
          value: "2 Inbound,Shanard Road (Shanard Avenue)"
      }
  ];

  function onRouteSelect(){

  }


  // test component
  it("RoutesPlanner state", async () => {

      // check if the component is loaded
      const t = shallow(<RoutesPlanner
          routeOptions={options}
          onRouteSelect={onRouteSelect}
          routes={routes}
          allStops={allStops} />);

  });
});
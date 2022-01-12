import fetchMock from "fetch-mock-jest";
import Search2 from "../Search2";
import waitUntil from "async-wait-until";
import { shallow, configure } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { API_URL } from "../config";

configure({ adapter: new Adapter() });

describe("<Search2/>", () => {
  // set up mock APIs
  beforeAll(() => {

    // create mock APIs
    fetchMock.get(API_URL + "/route_list", {
        "1 Inbound,Shanard Road (Shanard Avenue) - Saint John's Church,60-1-d12-1,3,1": [ "381", "7740", "7741"]
    });
    
    fetchMock.get(API_URL + "/stops", {
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
      }});

  });

  // test component
  it("Search2 state", async () => {
      const t = shallow(<Search2 />);
      // call componentDidMount
      await t.instance().componentDidMount();

      await waitUntil(() => {
        return Object.keys(t.state("routes")).length !== 0 &&
            Object.keys(t.state("allStops")).length !== 0
      });

    // expect 1 route
    expect(Object.keys(t.state("routes")).length).toBe(1);
    // expect 3 stops
    expect(Object.keys(t.state("allStops")).length).toBe(3);
  });
});
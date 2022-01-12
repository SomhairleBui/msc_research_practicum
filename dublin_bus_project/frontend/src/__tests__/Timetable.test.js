import fetchMock from "fetch-mock-jest";
import Timetable from "../components/RealTime";
import waitUntil from "async-wait-until";
import { shallow, configure } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { API_URL } from "../config";

configure({ adapter: new Adapter() });

describe("<Timetable/>", () => {
  // set up mock APIs
  beforeAll(() => {
    fetchMock.get(API_URL + "/timetable/8220DB000002", [
      {
        bus_number: "38A",
        arrival_time: 1627284179000,
      },
      {
        bus_number: "46E",
        arrival_time: 1627284289000,
      },
      {
        bus_number: "46A",
        arrival_time: 1627284311000,
      },
    ]);
  });

  // test component
  it("render timetable (3 routes)", async () => {
    // create stop
    const stop = {
      stop_name: "test stop",
      stop_id: "8220DB000002",
    };

    // create Timetable
    const t = shallow(<Timetable stop={stop} />);


    // call componentDidMount
    await t.instance().componentDidMount();

    // wait until state is ready
    await waitUntil(() => {
      return t.state("timetable").length !== 0;
    });


    // check timetable
    expect(t.state('timetable').length).toBe(3);

  });
});

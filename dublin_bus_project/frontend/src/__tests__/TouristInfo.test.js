import fetchMock from "fetch-mock-jest";
import TouristInfo from "../components/TouristInfo";
import waitUntil from "async-wait-until";
import { shallow, configure } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { API_URL } from "../config";

configure({ adapter: new Adapter() });

describe("<TouristInfo/>", () => {
  // set up mock APIs
  beforeAll(() => {
    fetchMock.get(API_URL + "/tourist/activities/tags", [
      {
        id: 2,
        name: "Cycling",
      },
      {
        id: 3,
        name: "Activity Operator",
      },
    ]);

    fetchMock.get(API_URL + "/tourist/accommodation/tags", [
      {
        id: 18,
        name: "Covid Safety Charter",
      },
      {
        id: 108,
        name: "Accommodation",
      },
    ]);

    fetchMock.get(API_URL + "/tourist/activities/locations?tags=3", [
      {
        id: 1,
        info_type:
          "['LocalBusiness', 'SportsActivityLocation', 'TravelAgency']",
        name: "Taste of Dublin - See Dublin by Bike",
        url: "http://www.seedublinbybike.ie",
        longitude: -6.26386371660237,
        latitude: 53.3419644759931,
        telephone: "+353(0)876955976",
        address: "Dublin City",
        image:
          "https://failtecdn.azureedge.net/failteireland/F%C3%A1ilte_Ireland_Logo_OpenDataAPI.jpg",
        group_name: "activities",
      },
    ]);

    fetchMock.get(API_URL + "/tourist/attractions/locations?tags=3", [
      {
        id: 1338,
        info_type:
          "['LocalBusiness', 'SportsActivityLocation', 'TouristAttraction', 'Aquarium', 'Zoo', 'CafeOrCoffeeShop', 'FoodEstablishment', 'Restaurant', 'ShoppingCenter']",
        name: "Dublin Zoo",
        url: "https://www.dublinzoo.ie/",
        longitude: -6.3052898,
        latitude: 53.3561935,
        telephone: "+35314748900",
        address: "Dublin City",
        image:
          "https://failtecdn.azureedge.net/failteireland/F%C3%A1ilte_Ireland_Logo_OpenDataAPI.jpg",
        group_name: "attractions",
      },
    ]);

    fetchMock.get(API_URL + "/tourist/accommodation/locations?tags=108", [
      {
        id: 1576,
        info_type: "['Hotel', 'LocalBusiness']",
        name: "InterContinental Dublin",
        url: "https://www.intercontinentaldublin.ie/",
        longitude: -6.22568826620102,
        latitude: 53.3265074868839,
        telephone: "+353(0)16654000",
        address: "Ballsbridge",
        image:
          "https://failtecdn.azureedge.net/failteireland/F%C3%A1ilte_Ireland_Logo_OpenDataAPI.jpg",
        group_name: "accommodation",
      },
    ]);

    // mock google object
    const google = {
      maps: {
        Size: function (w, h) {
          // mocking size function
        },
      },
    };
    window.google = google;
  });

  // test component
  it("test data fetching", async () => {
    // create Timetable
    const t = shallow(<TouristInfo showMenu="true" />);

    // call componentDidMount
    await t.instance().componentDidMount();

    // wait until state is ready
    await waitUntil(() => {
      return (
        t.state("activitiesTags").length !== 0 &&
        t.state("accommodationTags").length !== 0
      );
    });

    // check data length
    expect(t.state("activitiesTags").length === 2);
    expect(t.state("accommodationTags").length === 2);
    expect(t.state("attractionsTags").length === 0); // no attractions

    // select activity
    t.instance().selectActivities({ target: { value: 3 } });
    expect(t.state("selectedActivitiesTags")[0].id === 3);
    await waitUntil(() => {
      return t.state("activitiesLocations").length !== 0;
    });
    expect(
      t.state("activitiesLocations")[0].name ===
        "Taste of Dublin - See Dublin by Bike"
    );

    // select accommodation
    t.instance().selectAccommodation({ target: { value: 108 } });
    expect(t.state("selectedAccommodationTags")[0].id === 108);
    await waitUntil(() => {
      return t.state("accommodationLocations").length !== 0;
    });
    expect(
      t.state("accommodationLocations")[0].name === "InterContinental Dublin"
    );

    // select attraction
    t.instance().selectAttractions({ target: { value: 3 } });
    await waitUntil(() => {
      return t.state("attractionsLocations").length !== 0;
    });
    expect(t.state("attractionsLocations")[0].name === "Dublin Zoo");
  });
});

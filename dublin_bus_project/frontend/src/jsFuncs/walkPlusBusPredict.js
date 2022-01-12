import Axios from "axios";
import { API_URL } from "../config";
import { getDistance } from "geolib";

const getPredict = async (time, busLine, start_stop, end_stop) => {
  try {
    let res = await Axios.post(
      API_URL + `/predict2`,
      {
        predictTime: time,
        line_id: busLine,
        start_id: start_stop,
        end_id: end_stop,
      },
      {
        headers: {
          Authorization: `AuthKey`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data;
  } catch (err) {
    // if prediction server fails, return null, use default google prediction
    console.log("trouble connecting back end server");
    console.error(err);
    return null;
  }
};

export const walkPlusBusPredict = async (route, predictTime, locations) => {
  let steps = route["legs"][0]["steps"];
  let journeyDur = 0;

  for (const step of steps) {
    if (step["travel_mode"] === "WALKING") {
      journeyDur += step["duration"]["value"];
    } else {
      if (step["instructions"][3] === "m") {
        // transit using luas
        journeyDur += step["duration"]["value"];
        // added luas start/end stop name
      } else if (step["instructions"][3] === "i") {
        //trainsit using train
        journeyDur += step["duration"]["value"];
      } else {
        // transit using bus

        // default google predict duration
        let defaultDur = step["duration"]["value"];
        let details = step["transit"];
        let busLine = details["line"]["short_name"];

        let startStop = details["departure_stop"];
        let startStopLoc = {
          lat: startStop["location"].lat(),
          lng: startStop["location"].lng(),
        };

        let endStop = details["arrival_stop"];
        let endStopLoc = {
          lat: endStop["location"].lat(),
          lng: endStop["location"].lng(),
        };

        let route = locations[busLine];

        // Sort the bus stops by distance.
        route.sort((a, b) => {
          let distA = getDistance(startStopLoc, {
            lat: a.stop_lat,
            lng: a.stop_lon,
          });
          let distB = getDistance(startStopLoc, {
            lat: b.stop_lat,
            lng: b.stop_lon,
          });
          return distA - distB;
        });

        let startId = route[0]; // Get the closet stop on route.

        // Sort the bus stops by distance.
        route.sort((a, b) => {
          let distA = getDistance(endStopLoc, {
            lat: a.stop_lat,
            lng: a.stop_lon,
          });
          let distB = getDistance(endStopLoc, {
            lat: b.stop_lat,
            lng: b.stop_lon,
          });
          return distA - distB;
        });

        let endId = route[0]; // Get the closet stop on route.

        // get prediction time add to sum

        const res = await getPredict(
          predictTime,
          busLine,
          startId.stop_id,
          endId.stop_id
        );

        journeyDur += res ? res : defaultDur;
      }
    }
  }
  return journeyDur;
};

export const walkPlusBusBest = async (routes, predictTime, locations) => {
  let bestDur = null;
  let bestRouteInd = 0;

  // loop tho each route
  for (let i = 0; i < routes.length; i++) {
    let routeResults = await walkPlusBusPredict(
      routes[i],
      predictTime,
      locations
    );

    let journeyDur = routeResults;

    if (!bestDur) {
      bestDur = journeyDur;
    } else if (journeyDur < bestDur) {
      bestDur = journeyDur;
      bestRouteInd = i;
    }
  }

  console.log("return best route index", bestRouteInd, bestDur);
  return { bestRouteInd, bestDur };
};

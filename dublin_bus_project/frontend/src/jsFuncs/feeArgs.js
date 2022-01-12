export const feeArgs = (routeResponse) => {
  let busStopCount = [];
  let tramStopCount = [];
  let trainStopCount = [];
  let luasStopName = [];

  const steps = routeResponse["steps"];
  for (const step of steps) {
    if (step["travel_mode"][0] !== "W") {
      let stopCount = step["transit"]["num_stops"];

      if (step["instructions"][3] === "m") {
        // transit using luas
        tramStopCount.push(stopCount);
        // added luas start/end stop name
        luasStopName.push(step["transit"]["departure_stop"]["name"]);
        luasStopName.push(step["transit"]["arrival_stop"]["name"]);
      } else if (step["instructions"][3] === "i") {
        //trainsit using train
        trainStopCount.push(stopCount);
      } else {
        // transit using bus
        busStopCount.push(stopCount);
      }
    }
  }

  return [busStopCount, tramStopCount, trainStopCount, luasStopName];
};

import bus from "../bus.png";
import { Card, Row, Col } from "react-bootstrap";
import "./predictView.css";

export default function PredictionView(props) {
  var date = new Date(0);
  date.setSeconds(props.predictResult);
  var predictTime = date.toISOString().substr(11, 8); // convert seconds to HH:MM:SS format

  const predictCost = props.predictCost;
  const routeDetail = props.bestDetail;

  let showTime;
  if (predictTime) {
    showTime = (
      <>
        <img src={bus} width="50px" alt="bus" /> Predicted travel time:{" "}
        <strong>{predictTime}</strong>
        &nbsp; Estimated cost
        <img
          src="https://www.iconpacks.net/icons/2/free-icon-euro-coin-2141.png"
          width="20px"
          alt="euro"
        />
        <strong>{predictCost}</strong>
      </>
    );
  }

  let stepSeq = [];
  if (routeDetail) {
    let steps = routeDetail["steps"];
    const destination = routeDetail["end_address"];

    for (let step of steps) {
      let stepIns = step["instructions"];
      let stepMode = stepIns[3];

      if (stepMode === "k") {
        //walk
        let walkDis = step["distance"]["text"];
        stepSeq.push(
          <Col key={stepIns} className="noPadding" xs={3} md={2} xl={1}>
            <Card style={{ height: "100%" }}>
              <Card.Img
                variant="top"
                width="2px"
                src="https://image.flaticon.com/icons/png/512/565/565357.png"
              />
              <Card.Body>
                <Card.Title>Walk</Card.Title>
                <Card.Text>{walkDis}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        );
      } else if (stepMode === "m") {
        // luas --> tram
        let tStopCnt = step["transit"]["num_stops"];
        let tName = step["transit"]["line"]["short_name"];
        stepSeq.push(
          <Col key={stepIns} className="noPadding" xs={3} md={2} xl={1}>
            <Card style={{ height: "100%" }}>
              <Card.Img
                variant="top"
                width="2px"
                src="https://static.thenounproject.com/png/21833-200.png"
              />
              <Card.Body>
                <Card.Title>Luas</Card.Title>
                <Card.Text>
                  {tName} - {tStopCnt} Stops
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        );
      } else if (stepMode === "i") {
        // train
        let tStopCnt = step["transit"]["num_stops"];
        let tName = step["transit"]["line"]["short_name"];
        stepSeq.push(
          <Col key={stepIns} className="noPadding" xs={3} md={2} xl={1}>
            <Card style={{ height: "100%" }}>
              <Card.Img
                variant="top"
                width="2px"
                src="https://static.thenounproject.com/png/1110792-200.png"
              />
              <Card.Body>
                <Card.Title>Train</Card.Title>
                <Card.Text>
                  {tName} - {tStopCnt} Stops
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        );
      } else {
        //bus
        let tStopCnt = step["transit"]["num_stops"];
        let tName = step["transit"]["line"]["short_name"];
        stepSeq.push(
          <Col key={stepIns} className="noPadding" xs={3} md={2} xl={1}>
            <Card style={{ height: "100%" }}>
              <Card.Img
                variant="top"
                width="2px"
                src="https://image.flaticon.com/icons/png/512/635/635705.png"
              />
              <Card.Body>
                <Card.Title>Bus</Card.Title>
                <Card.Text>
                  Bus {tName} - {tStopCnt} Stops
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        );
      }

      stepSeq.push(
        <Col key={"ins" + stepIns} className="noPadding" xs={3} md={2} xl={1}>
          <Card style={{ height: "100%" }}>
            <Card.Img
              variant="top"
              width="5px"
              height="20%"
              src="https://image.flaticon.com/icons/png/512/724/724927.png"
            />
            <Card.Body>
              <Card.Text>{stepIns}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      );
    }

    stepSeq.push(
      <Col key={"final"} className="noPadding" xs={3} md={2} xl={1}>
        <Card style={{ height: "100%" }}>
          <Card.Img
            variant="top"
            width="5px"
            src="https://image.flaticon.com/icons/png/512/81/81426.png"
          />
          <Card.Body>
            <Card.Text>{destination}</Card.Text>
          </Card.Body>
        </Card>
      </Col>
    );
  }

  return (
    <>
      {showTime && (
        <div className="border rounded p-2 m-2 bg-light">
          {showTime}
          <Row>{stepSeq}</Row>
        </div>
      )}
    </>
  );
}

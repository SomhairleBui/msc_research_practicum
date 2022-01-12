import React from "react";
import {
  GoogleMap,
  DirectionsRenderer,
  DirectionsService,
  LoadScript,
  StandaloneSearchBox,
} from "@react-google-maps/api";
import { GOOGLE_API_KEY } from "../config";
import TimePicker from "./TimePicker";
import { walkPlusBusBest } from "../jsFuncs/walkPlusBusPredict";
import { feeArgs } from "../jsFuncs/feeArgs";
import PredictionView from "./PredictionView";
import { Container } from "react-bootstrap";

const center = { lat: 53.344, lng: -6.267 };
const libraries = ["places"];
const mapStyle = {
  height: "700px",
  width: "100%",
};

export default class Directions extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      response: null,
      travelMode: "TRANSIT",
      origin: "",
      destination: "",
      openInfoWin: true,
      predictDateTime: new Date(),
      predictMode: 0,
      showSingleRoute: false,
      bestRouteInd: null,
      bestRouteRsp: null,
      bestPredictDur: null,
      transitImpossible: false,
      controlOpen:true,
      predicting:false,

      pay:"Cash",
      adults: 1,
      children: 0,
      predictCost:null,
      

    }

    this.directionsCallback = this.directionsCallback.bind(this)
    this.getOrigin = this.getOrigin.bind(this)
    this.getDestination = this.getDestination.bind(this)
    this.onClick = this.onClick.bind(this)
    this.onMapClick = this.onMapClick.bind(this)
    this.changePredictMode = this.changePredictMode.bind(this)
    this.getDatetime = this.getDatetime.bind(this)
    this.changePayBy = this.changePayBy.bind(this)
    this.resetBestInd = this.resetBestInd.bind(this)
    this.cardActive= this.cardActive.bind(this)
    this.cashActive=this.cashActive.bind(this)
  }

  directionsCallback = async (response) => {
    console.log("received direction API", response);

    this.setState({ called: false });

    if (response !== null) {
      if (response.status === "OK") {
        this.setState({
          response: response,
          bestRouteInd: null,
        });

        //if server fails, no locations in props

        let pBestDur;
        let pBestRouteInd;
        if (this.state.locations) {
          let predict = await walkPlusBusBest(
            response["routes"],
            this.state.predictDateTime,
            this.props.locations
          );
          pBestDur = predict.bestDur;
          pBestRouteInd = predict.bestRouteInd;
        } else {
          pBestDur = response["routes"][0]["legs"][0]["duration"]["value"];
          pBestRouteInd = 0;
        }

        this.setState({
          bestRouteInd: pBestRouteInd,
          bestPredictDur: pBestDur,
          bestRouteRsp: response["routes"][pBestRouteInd]["legs"][0],
        });

        //found best route, do fee prediction here
           // return Array[busStopCount, tramStopCount, trainStopCount, luasStopName];
        //console.log("fee relevant arguments here", feeArgs(this.state.bestRouteRsp))

        // Get the busStopCount, luasStopCount, dartStopCount, luasStopNames, save to this variable
        let costVariables = feeArgs(this.state.bestRouteRsp)
        // Try clause to prevent crash is event of catastrophic failure

        try{
          // Set the prediction cost state to the value of the Total cost function with the appropriate variables
          this.setState({predictCost:this.totalCost(...costVariables)})
        }catch(err){
          // Else return a sorry message
          this.setState({predictCost:"Sorry no pricing info available!"})
        }


      } else if (response.status === "ZERO_RESULTS") {
        this.setState(this.setState({ transitImpossible: true }));
      } else {
        console.log("response: ", response);
      }
    }
  };

  // These two functions activate with the Onchange in the Cash/Card radio buttons, update the cash state, use for dictionary calling
  cashActive(){
    this.setState({pay:"Cash"})
  }
  cardActive(){
    this.setState({pay:"Card"})
  }
  
  //These two functions update the adults and children state with the current value in the input boxes
  updateAdults(evt){
    this.setState({
      adults:evt.target.value
    })
  }
  updateChildren(evt){
    this.setState({
      children:evt.target.value
    })
  }

  // Function that calculates the bus fare based on the number of stops and payment method
  busFare(stopCount,paymentMethod, firstBus= true){
    //Bus first is used when calculating the total, 90 minute discount and all that jazz

    // number of adults & children
    var adults = this.state.adults;
    var children = this.state.children;

    // Variables used to store if the route is express, is during school time fares,
    var express =false;
    var isSchool= false;

    /*Dictionary with costs in cash and card for adult
      1 Stage 1-3
      2 Stage 4-13
      3 Stage 13+
      4 Xpresso
      */
    var costAdult={1:{"Cash":2.15,"Card":1.55},2:{"Cash":3.00,"Card":2.25},3:{"Cash":3.30,"Card":2.50},4:{"Cash":3.80,"Card":3.00}};
      /*
      Dictionary with costs in cash and card for Child
       1 School fare Monday-Friday untill 19.00hr and Until 13.30hrs on Saturday
       2 Stage 1-7
       3 Stage 7+
       4 Xpresso
       */
    var costChild={1:{"Cash":1.00,"Card":0.80},2:{"Cash":1.30,"Card":1.00},3:{"Cash":1.00,"Card":1.30},4:{"Cash":1.60,"Card":1.26}};
  
    //Stores the price for Adult and Child, will be multipled by the amount of each
    var priceForAdult;
    var priceForChild;

    //Checks if the predict time is within the School fare time window (Sunday is 0 in javascript, because javascript)
    var day = this.state.predictDateTime.getDay();
    var hours = this.state.predictDateTime.getHours();
    var minutes = this.state.predictDateTime.getMinutes();
    switch(day >0 && day <5){
      case true:
        if(hours <=19){
          isSchool= true
        };
        break;
      case false:
        if(day == 6){
          if(hours < 13 || (hours == 13 && minutes <=30)){
            isSchool=true;
            break;
          };
        };    
    };
    /*
    Google directions doesnt return Express routes, Problem solved!. leaving this here incase that changes
    //Checks if the current route is express (express is a flat fare)
    if(busID[busID.length -1] == "X" || busID== "51D" || busID == "33D" ){
      express = true;
    };
    */ 

    //Switch statement that evaluates if the following expression are true
    switch(true){
      case (stopCount <=3 ):
        priceForAdult= costAdult[1][paymentMethod];
        priceForChild= costChild[2][paymentMethod];
        break;
      case(stopCount <=7):
        priceForAdult= costAdult[2][paymentMethod];
        priceForChild= costChild[2][paymentMethod];
        break;
      case(stopCount <= 13):
        priceForAdult= costAdult[2][paymentMethod];
        priceForChild= costChild[3][paymentMethod];
        break;
      case (stopCount > 13):
        priceForAdult= costAdult[3][paymentMethod];
        priceForChild= costChild[3][paymentMethod];
        break;
    };
  if(firstBus){
    // if its the first bus return normal price
    return (priceForAdult*this.state.adults)+(priceForChild*this.state.children)
  }else if (paymentMethod == "Cash"){
    // if its not the first bus but the payment method is cash (No discount)
    return (priceForAdult*this.state.adults)+(priceForChild*this.state.children)
  }else{
    // Else apply the 90 discount
    return ((priceForAdult*this.state.adults) - (1*this.state.adults))+((priceForChild*this.state.children) - (.75*this.state.children))
  }

  }

  // Function to calculate the cost of the Luas
  luasFare(startingStop,endingStop,paymentMethod){
    // Greenline stops
    var greenLine= ["BroomBridge","Cabra","Phibsborough","Grangegorman","Broadstone-DIT","Dominick","Parnell","Marlborough","Abbey Street",
                    "Trinity","O'Connell Upper","O'Connell- GPO","WestmoreLand","Dawson","St. Stephen's Green","Harcourt","Charlemont","Ranelagh",
                    "Beechwood","Cowper","Milltown","Windy Arbour","Dundrum","Balally","Kilmacud","Stillorgan","Sandyford","Central Park","Glencairn",
                    "The Gallops", "Leopardstown Valley","Ballyogan Wood","Carrickmines","Laughanstown","Cherrywood", "Brides Glen"]
    // Greenline stops that mark the transition between zones
    var greenBorders=["Broadstone - DIT", "Charlemont", "Dundrum", "Sandyford"]
    // Red line stops
    var redLine=["Saggart","Fortunestown","Citywest Campus","Cheeverstown","Fettercairn","Tallaght","Hospital","Cookstown","Belgard","Kingswood","Red Cow",
                  "Kylemore","Bluebell","Blackhorse","Drimnagh","Goldenbridge","Suir Road","Rialto","Fatima","James's","Heuston","Museum","Smithfield","Four Courts",
                  "Jervis","Abbey Street","Busáras","Connolly","George's Dock","Mayor Square - NCI","Spencer Dock", "The Point"]
    //red line transition stops
    var hardRedBorders=["Red Cow","Suir Road","Heuston"]
    // Busaras and Georges both mark a transition between the same zones, need to be in different list to avoid a double bump in price
    var softRedBorders=["Busáras","George's Dock"]

    let route;
    let zoneCount=0 ;

    // If its the green line
    if (greenLine.includes(startingStop) && greenLine.includes(endingStop)){
      // Get the index of the stops (min and max sort out the direction)
      let startIndex=Math.min(greenLine.indexOf(startingStop),greenLine.indexOf(endingStop))
      let endIndex=Math.max(greenLine.indexOf(startingStop),greenLine.indexOf(endingStop))
      // Get the route by slicing the stops at the index (first and last dont matter, only middle transitions count)
      route = greenLine.slice(startIndex +1,endIndex)
      // Get array of transition stops that are in the route
      let transitions = route.filter(stop => greenBorders.includes(stop))
      // Get the number of transitions that occur
      zoneCount = transitions.length
    }else{
      // Pretty much the same for the Redline
      let startIndex=Math.min(redLine.indexOf(startingStop),redLine.indexOf(endingStop))
      let endIndex=Math.max(redLine.indexOf(startingStop),redLine.indexOf(endingStop))
      route = redLine.slice(startIndex +1,endIndex)
      let softBorder=0;
      let transitionsHard=route.filter(stop => hardRedBorders.includes(stop));
      // This lil statement is for the Busaras Georges dock double stop transition area
      for (var i=0; i<softRedBorders.length; i++){
        if(route.includes(softRedBorders[i])){
          softBorder=1;
        }
      }
      zoneCount=transitionsHard.length + softBorder
    }
    /*
    Dictionaries with price for adults and children, cash and card
    1 = 1 zone
    2 = 2 zones
    3 = 3 zones
    4 = 4 zones
    5 = 5-8 zones
    */
   
    var costAdult={1:{"Cash":2.10,"Card":1.54},2:{"Cash":2.80,"Card":2.00},3:{"Cash":3.10,"Card":2.27},4:{"Cash":3.10,"Card":2.27},5:{"Cash":3.20,"Card":2.40}}
    var costChild={1:{"Cash":1.00,"Card":.80},2:{"Cash":1.00,"Card":0.80},3:{"Cash":3.10,"Card":.80},4:{"Cash":1.30,"Card":1.00},5:{"Cash":1.30,"Card":1.00}}

    var priceForAdult;
    var priceForChild;
    // Switch statement to get the price
    switch(true){
      case(zoneCount < 5):
        priceForAdult=costAdult[zoneCount][paymentMethod];
        priceForChild=costChild[zoneCount][paymentMethod];
        break;
      case(zoneCount >= 5):
        priceForAdult=costAdult[5][paymentMethod];
        priceForChild=costChild[5][paymentMethod];
        break;
      }
    // Was freaking out at some points if tried to return directly, so save to variable and then return
    let finalCost=(priceForAdult*this.state.adults)+(priceForChild*this.state.children)
    return finalCost;

    }
  
  // Function to get the dart fare based on number of stops
  dartFare(number_of_stops,paymentMethod,){
    // School times, Until 7 during the week and until 1 at the weekend
    var schoolFlag="Regular"
    // Used to evaluate if its school time (different prices if it is)
    var day = this.state.predictDateTime.getDay();
    var hours = this.state.predictDateTime.getHours();
    // change the schoolFlag if it is
    switch(day > 0 && day < 5){
      case true:
        if(hours <= 19){
          schoolFlag="School"
        };
        break;
      case false:
        if(hours <= 13){
          schoolFlag="School"
        }
    }
    /*
    1: 1 stop
    2: 2 stops
    3: 6 stops
    4: 12 stops
    5: 20 stops
    6: 24 stops
    Not 100% accurate, based off irish rail fare calculator and lot of wasted time, contacted Irish rail, will update if they ever get back to me
    - Sam
    */
    var costAdult={1:{"Cash":2.25,"Card":1.70},2:{"Cash":2.70,"Card":2.10},3:{"Cash":3.30,"Card":2.40},4:{"Cash":3.60,"Card":2.80},5:{"Cash":4.90,"Card":3.80},6:{"Cash":6.20,"Card":4.90}}
    var costChild={1:{"Regular":1.25,"School":.80},2:{"Regular":1.45,"School":.80},3:{"Regular":1.65,"School":.80},4:{"Regular":1.75,"School":.80},5:{"Regular":1.95,"School":.80},6:{"Regular":2.55,"School":.80}}

    var priceForAdult;
    var priceForChild;

    switch(true){
      case(number_of_stops == 1):
        priceForAdult = costAdult[1][paymentMethod];
        priceForChild=costChild[1][schoolFlag];
        break;
      case(number_of_stops>2 && number_of_stops <=6):
        priceForAdult = costAdult[2][paymentMethod];
        priceForChild=costChild[2][schoolFlag];
        break;
      case(number_of_stops>6 && number_of_stops <= 12):
        priceForAdult = costAdult[3][paymentMethod];
        priceForChild=costChild[3][schoolFlag];
        break;
      case(number_of_stops>12 && number_of_stops <= 20):
        priceForAdult = costAdult[4][paymentMethod];
        priceForChild=costChild[4][schoolFlag];
        break;
      case(number_of_stops>20 && number_of_stops <=24):
        priceForAdult = costAdult[5][paymentMethod];
        priceForChild=costChild[5][schoolFlag];
        break;
      case(number_of_stops > 24):
        priceForAdult = costAdult[6][paymentMethod];
        priceForChild=costChild[6][schoolFlag];
        break;
    }
    return (priceForAdult*this.state.adults)+(priceForChild*this.state.children)
  }

  //Function to get the total cost of a journey
  totalCost(busStopCount, luasStopCount, dartStopCount, luasStopName){
    // Get the payment method and intialise a total cost of each at zero
    let paymentMethod=this.state.pay;
    let totalLuasCost=0;
    let totalBusCost=0;
    let totalDartCost=0;

    //Get the bus cost, if theres more than 1 entry that means more than one bus journey
    // Means 90 discount
    if(busStopCount){
      let sumBusCost = 0;
      let firstBus=true;
      for (var i = 0; i<busStopCount.length; i++){
        if(firstBus == true){
          let busCost = this.busFare(busStopCount[i],paymentMethod)
          sumBusCost = sumBusCost+ busCost
          firstBus = false;
        }else{
          let busCost = this.busFare(busStopCount[i],paymentMethod,false)
          sumBusCost = sumBusCost + busCost
        }
      }
      totalBusCost = sumBusCost
  }

    //Get the Luas cost
    if(luasStopName){
      let sumluasCost =0;
      for (var i = 0; i<luasStopCount.length; i+= 2){
        let luasCost = this.luasFare(luasStopName[i],luasStopName[i+1],paymentMethod);
        sumluasCost= sumluasCost +luasCost
      }
      totalLuasCost=sumluasCost
  }
  //get the dart
  if(dartStopCount){
      let sumDartCost =0;
      for (var i =0; i< dartStopCount.length; i++){
        let dartCost= this.dartFare(dartStopCount[i],paymentMethod)
        sumDartCost = sumDartCost + dartCost
      }
      totalDartCost = sumDartCost

    }
  console.log("TOTAL BUS:",totalBusCost,"TOTAL LUAS :",totalLuasCost,"TOTAL DART:",totalDartCost)
  // Return the sum of the totals rounded to two decimal places
  return (totalBusCost+totalDartCost+totalLuasCost).toFixed(2)
  }

  getOrigin(ref) {
    this.origin = ref;
  }

  getDestination(ref) {
    this.destination = ref;
  }

  onClick() {
    if (this.origin.value !== "" && this.destination.value !== "") {
      this.setState(() => ({
        origin: this.origin.value,
        destination: this.destination.value,
        called: true,
        transitImpossible: false,
      }));
    }
  }

  onMapClick(...args) {
    console.log("onClick args: ", args);
  }

  // function for pass datetime value from timepicker function
  getDatetime(pickerDate) {
    this.setState({ predictDateTime: pickerDate });
  }

  changePayBy(e) {
    if (e.target.value !== this.state.payBy) {
      this.setState({
        payBy: e.target.value,
      });
    }
  }

  changePredictMode(e) {
    this.setState({
      predictMode: e.target.value,
      called: false,
      transitImpossible: false,
    });
  }

  resetBestInd() {
    this.setState({
      bestRouteInd: null,
    });
  }

  render() {
    return (
      <LoadScript googleMapsApiKey={GOOGLE_API_KEY} libraries={libraries}>
        <div className="map" height="100%">
          <div className="map-settings">
            <hr className="mt-0 mb-3" />

            <input
              type="image"
              src="https://image.flaticon.com/icons/png/512/566/566004.png"
              alt="arrow"
              width="40px"
              height="25px"
              className="btn btn-link"
              data-toggle="collapse"
              data-target="#collapseControl"
              aria-expanded="true"
              aria-controls="collapseOne"
            ></input>
            <div className="collapse show" id="collapseControl">
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="ORIGIN">Origin</label>
                    <br />
                    <StandaloneSearchBox
                      bounds={{
                        north: 53.38,
                        west: -6.38,
                        east: -6.18,
                        south: 53.22,
                      }}
                    >
                      <input
                        id="ORIGIN"
                        className="form-control"
                        type="text"
                        ref={this.getOrigin}
                        placeholder="Enter origin"
                      />
                    </StandaloneSearchBox>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="form-group">
                    <label htmlFor="DESTINATION">Destination</label>
                    <br />
                    <StandaloneSearchBox
                      bounds={{
                        north: 53.38,
                        west: -6.38,
                        east: -6.18,
                        south: 53.22,
                      }}
                    >
                      <input
                        id="DESTINATION"
                        className="form-control"
                        type="text"
                        ref={this.getDestination}
                        placeholder="Enter destination"
                      />
                    </StandaloneSearchBox>
                  </div>
                </div>
              </div>
              <div className="container">
                <div className="row">
                  {/* FEATURE NOT WORKING FOR PLANNER YET}
                <div className="col-md-2">
                  <select name="payBy" onChange={this.changePayBy} className="form-control">
                    <option value="0">Pay by Cash</option>
                    <option value="1">Pay by Leap</option>
                  </select>
                </div>
                  */}
                  <div className="col-md-2">
                    <select
                      name="timeMode"
                      onChange={this.changePredictMode}
                      className="form-control"
                    >
                      <option value="0">Start Now</option>
                      <option value="1">Depart at: </option>
                      <option value="2">Arrive by: </option>
                    </select>
                  </div>
                  <div className="col-md-5">
                    <TimePicker
                      update={this.getDatetime}
                      predictNow={this.state.predictMode == 0}
                    />
                  </div>
                  <div className="col-md-5">
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={this.onClick}
                    >
                      Plan journey & get travel duration
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-8">
              <label htmlFor="adults">Adults:</label>
              <input type="number" id="adults" name="adults" min="0" max="10" value={this.state.adults} onChange={evt => this.updateAdults(evt)}></input>
              <label htmlFor="children">Children(Age 5+):</label>
              <input htmltype="number" id="children" name="children" min="0" max="10" value ={this.state.children} onChange={evt => this.updateChildren(evt)}></input>
              <input type="radio" id="Cash" name="PaymentType" value="Cash" onClick={this.cashActive} defaultChecked="checked"></input>
              <label htmlFor="Cash">Cash</label>
              <input type="radio" id="Card" name="PaymentType" value="Card" onClick={this.cardActive}></input>
              <label htmlFor="Card">Leap Card</label>
          </div>

              {/* get time prediction from best route 
            FEATURE NOT WORKING FOR PLANNER YET */}
              {this.state.bestPredictDur && this.state.bestRouteRsp && (
                <Container fluid={this.state.predictCost}>
                  <PredictionView
                    predictCost={this.state.predictCost}
                    predictResult={this.state.bestPredictDur}
                    bestDetail={this.state.bestRouteRsp}
                  />
                </Container>
              )}
            </div>
            <div className="map-container">
              <GoogleMap
                id="direction-example"
                mapContainerStyle={mapStyle}
                // required
                zoom={12}
                // required
                center={center}
                options={{ gestureHandling: "greedy" }}
              >
                {this.state.destination !== "" &&
                  this.state.origin !== "" &&
                  this.state.predictMode == 0 &&
                  this.state.called && (
                    <DirectionsService
                      // required
                      options={{
                        destination: this.state.destination,
                        origin: this.state.origin,
                        travelMode: this.state.travelMode,
                        provideRouteAlternatives: true,
                      }}
                      // required
                      callback={this.directionsCallback}
                    />
                  )}
                {this.state.destination !== "" &&
                  this.state.origin !== "" &&
                  this.state.predictMode == 2 &&
                  this.state.called && (
                    <DirectionsService
                      // required
                      options={{
                        destination: this.state.destination,
                        origin: this.state.origin,
                        travelMode: this.state.travelMode,
                        provideRouteAlternatives: true,
                        transitOptions: {
                          arrivalTime: this.state.predictDateTime,
                        },
                      }}
                      // required
                      callback={this.directionsCallback}
                    />
                  )}
                {this.state.destination !== "" &&
                  this.state.origin !== "" &&
                  this.state.predictMode == 1 &&
                  this.state.called && (
                    <DirectionsService
                      // required
                      options={{
                        destination: this.state.destination,
                        origin: this.state.origin,
                        travelMode: this.state.travelMode,
                        provideRouteAlternatives: true,
                        transitOptions: {
                          departureTime: this.state.predictDateTime,
                        },
                      }}
                      // required
                      callback={this.directionsCallback}
                    />
                  )}

                {this.state.response !== null &&
                  this.state.bestRouteInd !== null && (
                    <DirectionsRenderer
                      // required
                      options={{
                        directions: this.state.response,
                        // specificed shown route
                        routeIndex: this.state.bestRouteInd,
                      }}
                      onUnmount={this.resetBestInd}
                    />
                  )}
              </GoogleMap>
            </div>
          </div>
      </LoadScript>
    );
  }
}

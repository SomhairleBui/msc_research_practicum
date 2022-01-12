import json
import pickle
import datetime
from datetime import datetime as dt
from datetime import timedelta
import pytz
import joblib
import pandas as pd
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from tensorflow.keras.models import load_model
import numpy as np
from dublin_bus_app.models import Current, Hourly, Daily
from dateutil import parser


def stops_and_hops(route_id, start_station, stop_station):
    """
    Function gets the chain of hops.
    """
    routes = pickle.load(open('dublin_bus_app/data/routes.pickle', 'rb'))
    route = routes[route_id]
    try:
        # find index of searched stops
        start_station_index = route.index(start_station)
        stop_station_index = route.index(stop_station)
        # slice stops
        list_of_stops = route[start_station_index: stop_station_index + 1]
        # build chain of hops
        chain_of_hops = []
        for i in range(len(list_of_stops) - 1):
            chain_of_hops.append((list_of_stops[i], list_of_stops[i + 1]))
        return chain_of_hops
    except ValueError as e:
        print(e, 'Stops not in route!')
        return []


def weather_and_holiday(predict_time, current_time, arrival_code):
    """
    Function which takes a datetime and
    returns the closest matching, most recent forecast and a holiday boolean.
    """

    print('CURRENT TIME', current_time)
    print('PREDICT TIME', predict_time)

    # If the predicted time
    if (predict_time - current_time).total_seconds() < 1800:
        df = pd.DataFrame.from_records(Current.objects.all().values())
        hourly = True
    # if the predicted time is less than 47.5 hours away (Hourly predictions are only for 48 hours in advance)
    elif (predict_time - current_time).total_seconds() < (60*60*48 - 1800):
        # The query is the hourly query
        df = pd.DataFrame.from_records(Hourly.objects.all().values())
        weather_time = predict_time.replace(hour=(-(arrival_code // -2) % 24), minute=0, second=0, microsecond=0)
        hourly = True
        # Get the matching weather row frame
        df = df[df['future_dt'] == weather_time.astimezone(pytz.utc)]
    else:
        # Else its the daily query
        df = pd.DataFrame.from_records(Daily.objects.all().values())
        weather_time = predict_time.astimezone(pytz.utc).date()
        hourly = False
        # Get the matching weather row frame
        df = df[df['future_dt'] == weather_time]

    print(df)

    # Is it a holiday?
    df_hols = pd.read_csv('dublin_bus_app/data//holidays.csv')
    df_hols['holiday_date'] = pd.to_datetime(df_hols['holiday_date'])
    if hourly:
        df['future_dt'] = df['future_dt'].dt.tz_convert(tz=pytz.timezone('Europe/Dublin'))
        df['future_dt'] = df['future_dt'].dt.date
    condition = df['future_dt'].isin(df_hols['holiday_date'])
    df['holiday'] = 0
    df.loc[condition, 'holiday'] = 1
    return df

# Old Method for calculating the fare in the backend
# Leaving it here in case in comes in handy for the journey planning calculation
#Will remove before final deployment if not
def fare_calculator(stops,predicttime,adult=1,child=0, cash=True):
    school= False
    express=False
    route = stops[0][0]

    pay_method="Card"
    if cash:
        pay_method="Cash"
    
    if route[-1] == "x" or route == "51d" or route == "33d":
        express= True
    
    day= predicttime.weekday()
    hour= predicttime.hour
    minutes=predicttime.minute

    if day <=5:
        if hour <=19 & day <=4:
            school = True
        elif hour <= 13 & minutes <=30 & day == 5:
            school = True
        else:
            school = False
    print(predicttime.weekday())
    print(predicttime.hour)

    number_of_stops=len(stops)
    #Dictionary with costs in cash and card for adult
    # 1 Stage 1-3
    # 2 Stage 4-13
    # 3 Stage 13+
    # 4 Xpresso
    cost_adult={1:{"Cash":2.15,"Card":1.55},2:{"Cash":3.00,"Card":2.25},3:{"Cash":3.30,"Card":2.50},4:{"Cash":3.80,"Card":3.00}}

    #Dictionary with costs in cash and card for Child
    # 1 School fare Monday-Friday untill 19.00hr and Until 13.30hrs on Saturday
    # 2 Stage 1-7
    # 3 Stage 7+
    # 4 Xpresso
    cost_child={1:{"Cash":1.00,"Card":0.80},2:{"Cash":1.30,"Card":1.00},3:{"Cash":1.00,"Card":1.30},4:{"Cash":1.60,"Card":1.26}}

    fare={}

    if express == True:
        if adult !=0:
            fare["Adult"]=4
        if child !=0:
            fare["Child"]=4 
    else:   
        if adult !=0:
            if number_of_stops <=3:
                fare["Adult"]= 1
            elif number_of_stops <=7:
                fare["Adult"]= 2
            else:
                fare["Adult"]= 3

        if child != 0:
            if school == True:
                fare["Child"]=1
            elif number_of_stops <=7:
                fare["Child"]= 2
            elif number_of_stops >7:
                fare["Child"]= 3


    final_cost=0

    if "Adult" in fare:
        cost_a=cost_adult[fare["Adult"]]
        cost_a=cost_a[pay_method] * adult
        final_cost+=cost_a
    if "Child" in fare:
        cost_b=cost_child[fare["Child"]]
        cost_b=cost_a[pay_method] * child
        final_cost += cost_b
    return final_cost




def prepare_data(predict_time, route_id, weather, chain_of_hops):
    """
    Function returns lists of data tuples for each hop and stop
    """
    route = route_id.split(',')[2]
    route_var = route_id.split(',')[3]
    direction = route_id.split(',')[4]

    # Get Data for Stops and Hops
    # first_stop_id = chain_of_hops[0][0]
    hops = pickle.load(open('dublin_bus_app/data/hops.pickle', 'rb'))
    # key = (route, route_var, direction, first_stop_id)
    # stop_sequence, shape_dist, hop_dist = hops[key]
    line_id = route.split('-')[1]
    # stop_data = (line_id, direction, first_stop_id, stop_sequence, shape_dist, hop_dist)  #####
    stops_to_predict = []

    # Convert time of day to sin and cos time
    day = 86400
    day_secs = (predict_time - predict_time.replace(hour=0, minute=0, second=0)).seconds
    sin_day = np.sin(2 * np.pi * day_secs / day)
    cos_day = np.cos(2 * np.pi * day_secs / day)

    # Get the weekday num and convert time of week to sin and cos time
    day_num = predict_time.weekday()
    week = 7
    sin_week = np.sin(2 * np.pi * day_num / week)
    cos_week = np.cos(2 * np.pi * day_num / week)

    # Get seconds from beginning of year
    year_secs = (predict_time - predict_time.replace(month=1, day=1, hour=0, minute=0, second=0)).seconds

    # Convert time of year in seconds to sin and cos time
    year = day * 365.2425
    sin_year = np.sin(2 * np.pi * year_secs / year)
    cos_year = np.cos(2 * np.pi * year_secs / year)

    # Load stops_lat and _lon dicts
    stops_lat = pickle.load(open('dublin_bus_app/data/gtfs_stops_lat.pickle', 'rb'))
    stops_lon = pickle.load(open('dublin_bus_app/data/gtfs_stops_lon.pickle', 'rb'))

    # Compile the data
    hops_to_predict = []
    for hop in chain_of_hops:
        prev_stop = hop[0]
        stop_id = hop[1]
        key = (route, route_var, direction, stop_id)
        stop_sequence, shape_dist, hop_dist = hops[key]

        # Convert wind_speed and wind_deg to vector
        wind_speed = weather.wind_speed.values[0]
        wind_rad = weather.wind_deg.values[0] * np.pi / 180
        sin_wind = wind_speed * np.sin(wind_rad)
        cos_wind = wind_speed * np.cos(wind_rad)

        # Get lat and lon for stop_id and prev_stop from dicts
        stop_lat = stops_lat[stop_id]
        stop_lon = stops_lon[stop_id]
        prev_lat = stops_lat[prev_stop]
        prev_lon = stops_lon[prev_stop]

        # Hops
        hop_data = (line_id, stop_sequence, stop_id,
                    prev_stop, shape_dist, hop_dist,
                    weather.temp.values[0], weather.feels_like.values[0], weather.pressure.values[0],
                    weather.humidity.values[0], weather.clouds.values[0], weather.weather_main.values[0],
                    weather.weather_desc.values[0], weather.rain_bool.values[0], weather.holiday.values[0],
                    sin_wind, cos_wind, sin_day, cos_day, sin_week, cos_week, sin_year, cos_year,
                    stop_lat, stop_lon, prev_lat, prev_lon)

        hops_to_predict.append(hop_data)

        # Stops
        stop_data = (line_id, stop_sequence, shape_dist, hop_dist, weather.holiday.values[0],
                    weather.temp.values[0], weather.feels_like.values[0], weather.pressure.values[0],
                    weather.humidity.values[0], weather.clouds.values[0], weather.weather_main.values[0],
                    weather.rain_bool.values[0], stop_lat, stop_lon, prev_lat, prev_lon, sin_wind, cos_wind, sin_day,
                    cos_day, sin_week, cos_week, sin_year, cos_year)

        stops_to_predict.append(stop_data)

    return hops_to_predict, stops_to_predict


def prepare_hops_dataframe(hops_to_predict):
    """
    Function converts list of hops data to a dataframe and prepares and returns a coded and scaled numpy array
    """
    # Compile hop data into dataframe
    df = pd.DataFrame(hops_to_predict, columns=['line_id', 'stop_sequence', 'stop_id',
                                                'prev_stop', 'shape_dist', 'hop_dist', 'temp',
                                                'feels_like', 'pressure', 'humidity',
                                                'clouds', 'weather_main', 'weather_desc', 'rain_bool', 'holiday',
                                                'sin_wind', 'cos_wind', 'sin_day', 'cos_day', 'sin_week',
                                                'cos_week', 'sin_year', 'cos_year',
                                                'stop_lat', 'stop_lon', 'prev_lat', 'prev_lon'])

    # Check the types
    df = df.astype({'line_id': 'string', 'stop_sequence': 'int64',
                    'stop_id': 'int64', 'prev_stop': 'int64', 'hop_dist': 'int64',
                    'shape_dist': 'int64', 'temp': 'float64', 'feels_like': 'float64', 'pressure': 'float64',
                    'humidity': 'float64', 'clouds': 'float64',
                    'rain_bool': 'int64', 'holiday': 'int64'})

    # Encode string features
    encoder = joblib.load('analytics/train/encoder')
    df[['line_id', 'weather_main',
        'weather_desc']] = encoder.transform(df[['line_id', 'weather_main', 'weather_desc']])

    # Load x scaler and scale the features
    scaler_x = joblib.load('analytics/train/scaler_x_train')
    hops_data = scaler_x.transform(df)

    return hops_data


def prepare_stops_dataframe(stops_to_predict):
    """
       Function converts list of stops data to a dataframe and prepares and returns a coded and scaled numpy array
    """
    #compile the data into a dataframe 
    df = pd.DataFrame(stops_to_predict, columns=["line_id", "stop_sequence", "shape_dist", "hop_dist", "holiday",
                                                 "temp", "feels_like", "pressure", "humidity", "clouds_all",
                                                 "weather_main", "rain", "stop_lat", "stop_lon", "prev_lat",
                                                 "prev_lon", "sin_wind", "cos_wind", "sin_day",
                                                 "cos_day", "sin_week", "cos_week", "sin_year", "cos_year"])
    
    df = df.astype({'line_id': 'string', "weather_main": "string", 'stop_sequence': 'int64',
                    'shape_dist': 'float64', 'hop_dist': 'int64', "holiday": "int64",
                    'temp': 'float64', 'feels_like': 'float64', 'pressure': 'float64',
                    'humidity': 'float64', 'clouds_all': 'float64',
                    'rain': 'int64'})

    encoder = joblib.load('analytics/stops/fullencoder')
    df[['line_id', 'weather_main']] = encoder.transform(df[['line_id', 'weather_main']])

    scaler_x = joblib.load('analytics/stops/fullscalerX_nohop')
    stops_data = scaler_x.transform(df)
    
    return stops_data


def predict(predict_time, route_id, starting_station, end_station):
    # Get the current time (for comparison)
    current_time = pytz.timezone('Europe/Dublin').localize(dt.now())
    if predict_time < current_time:
        predict_time = current_time

    # Get the arrival time code (0-47 half hours per day)
    midnight = predict_time.replace(hour=0, minute=0, second=0)
    arrival_code = (predict_time - midnight).seconds // 1800

    # Get the weather and holiday data
    weather = weather_and_holiday(predict_time, current_time, arrival_code)

    # Get the stops and hops
    chain_of_hops = stops_and_hops(route_id, starting_station, end_station)

    # Compile the lists of data on which to predict
    hops_to_predict, stops_to_predict = prepare_data(predict_time, route_id, weather, chain_of_hops)

    # Process and scale the hops data
    hops_data = prepare_hops_dataframe(hops_to_predict)

    # Same for the stops data
    stops_data = prepare_stops_dataframe(stops_to_predict)

    # Load hops model and predict
    hops_model = load_model('analytics/hops_model')
    predictions_hops = hops_model(hops_data)

    #load stops model and predict
    stops_model = load_model('analytics/stops/stops_model_nohop')
    predictions_stops = stops_model.predict(stops_data)

    # Load y scaler and inverse scaling
    scaler_y = joblib.load('analytics/train/scaler_y_train')
    predictions_hops = scaler_y.inverse_transform(predictions_hops)

    #load stops scaler and inverse
    scaler_y_stops = joblib.load('analytics/stops/fullscalerY_nohop')
    predictions_stops = scaler_y_stops.inverse_transform(predictions_stops)

    # Convert to H:M:S kary-test
    prediction_hop = datetime.timedelta(seconds=int(predictions_hops.sum())).seconds
    prediction_stop = datetime.timedelta(seconds=int(predictions_stops.sum())).seconds
    total_prediction = str(prediction_hop + prediction_stop)

    print('Hops prediction:', prediction_hop, "\nStops prediction", prediction_stop)
    print("Total", total_prediction)
    return total_prediction

@method_decorator(csrf_exempt, name='dispatch')
def get_predict_info(request):
    """
    Function makes a prediction based on information received from the frontend and returns a prediction in H:M:S format
    """
    # Get the weather forecast using the function above
    request.data = json.loads(request.body)
    predict_time = str(request.data["predictTime"])
    predict_time = parser.parse(predict_time)
    predict_time = predict_time.astimezone(pytz.timezone('Europe/Dublin'))
    print('predict_time:', predict_time)

    # Get the needed route variables for the stops and hops
    route_id = str(request.data["route_id"])
    starting_station = str(request.data["start_station"])
    end_station = str(request.data["stop_station"])

    # Get total prediction
    total_prediction = predict(predict_time, route_id, starting_station, end_station)

    # Send prediction message back to the frontend
    if request.method == 'POST':
        return HttpResponse(f"{total_prediction}")


@method_decorator(csrf_exempt, name='dispatch')
def get_predict_info2(request):
    """
    Function makes a prediction based on information received from the frontend and returns a prediction in H:M:S format
    """
    # Get the weather forecast using the function above
    request.data = json.loads(request.body)
    predict_time = str(request.data["predictTime"])
    predict_time = parser.parse(predict_time)
    predict_time = predict_time.astimezone(pytz.timezone('Europe/Dublin'))
    print('predict_time:', predict_time)

    # Get the needed route variables for the stops and hops
    line_id = str(request.data["line_id"])
    starting_station = str(request.data["start_id"])
    end_station = str(request.data["end_id"])

    # Query inverted index to find matching route_id for journey
    iindex = pickle.load(open('dublin_bus_app/data/iindex.pickle', 'rb'))
    journey = [(line_id, starting_station), (line_id, end_station)]
    potential_routes = set.intersection(*(iindex[pair] for pair in journey))
    route_id = potential_routes.pop()  # Just get one match

    # Get total_prediction
    total_prediction = predict(predict_time, route_id, starting_station, end_station)

    # Send prediction message back to the frontend
    if request.method == 'POST':
        return HttpResponse(f"{total_prediction}")



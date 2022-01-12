from django.http.response import HttpResponse
from django.http import JsonResponse
from dublin_bus_app.models import Times, Current
import pandas as pd
import json
from datetime import datetime as dt
from datetime import timedelta
import pytz
import pickle
from functools import lru_cache


def index(request):
    return HttpResponse()


def weather(request):
    df = pd.DataFrame.from_records(Current.objects.all().values())
    current_weather = df.to_dict(orient='records')[0]
    return JsonResponse(current_weather)


@lru_cache(maxsize=None)
def route_list(request):
    # return list of routes with stops
    routes = pickle.load(open('dublin_bus_app/data/routes.pickle', 'rb'))
    return JsonResponse(routes, safe=False)


def timetable(request, stop_id):
    # get the real time information for a stop
    try:
        # get bus times for a given stop
        df_times = pd.DataFrame.from_records(Times.objects.filter(stop_id=stop_id).order_by('arrival_time').values())
        # convert arrival time
        df_times['arrival_time'] = pd.to_datetime(df_times['arrival_time'])
        # current time
        now = dt.now(tz=pytz.timezone('Europe/Dublin'))
        # filer results for 30 seconds
        time_mask = (df_times['arrival_time'] >= (now - timedelta(seconds=30)))
        df = df_times[time_mask]
        # get only the required columns
        df = df[['arrival_time', 'trip_id']]
        # get bus number
        df['bus_number'] = df['trip_id'].str.split('-', expand=True)[1]
        # return the data
        df = df[['bus_number', 'arrival_time']]
        return JsonResponse(json.loads(df.to_json(orient="records")), safe=False)
    except KeyError as e:
        print(e)
        return JsonResponse(json.loads('[]'), safe=False)


@lru_cache(maxsize=None)
def stops(request):
    stops_dic = pickle.load(open('dublin_bus_app/data/stops.pickle', 'rb'))
    return JsonResponse(stops_dic, safe=False)


@lru_cache(maxsize=None)
def locations(request):
    locations_dic = pickle.load(open('dublin_bus_app/data/locations.pickle', 'rb'))
    return JsonResponse(locations_dic, safe=False)

@lru_cache(maxsize=None)
def shapes(request):
    shapes_dic = pickle.load(open('dublin_bus_app/data/shapes.pickle', 'rb'))
    return JsonResponse(shapes_dic, safe=False)


def real_time(request):
    no_data = True
    while no_data:
        try:
            df_times = pd.DataFrame.from_records(Times.objects.all().values())
            no_data = False
        except Exception as e:
            print(e)
            continue

    # Get the realtime info within a window of now.
    now = dt.now(tz=pytz.timezone('Europe/Dublin'))
    df_times['arrival_time'] = df_times['arrival_time'].dt.tz_convert(pytz.timezone('Europe/Dublin'))
    time_mask = ((df_times['arrival_time'] >= now - timedelta(seconds=120)) &
                 (df_times['arrival_time'] <= now + timedelta(seconds=300)))
    df = df_times.loc[time_mask]
    df = df.groupby(by='trip_id').head(8)

    return JsonResponse(json.loads(df.to_json(orient="records")), safe=False)

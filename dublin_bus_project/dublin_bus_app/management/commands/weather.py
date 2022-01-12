from django.core.management.base import BaseCommand
import requests
import traceback
import datetime as dt
import pytz
from dublin_bus_app.models import Current, Hourly, Daily
from bulk_sync import bulk_sync  # See docs at: https://pypi.org/project/django-bulk-sync/
from dublin_bus_app.dbinfo import *

WEATHER = "http://pro.openweathermap.org/data/2.5/onecall"
LAT = 53.344  # Dublin City Hall
LON = -6.2672


class Command(BaseCommand):
    help = 'Gets weather data and stores in model'

    def handle(self, *args, **kwargs):
        print('Starting Weathers...')
        # Get the weather data.
        try:
            weathers = requests.get(WEATHER, params={'lat': LAT, 'lon': LON, 'exclude': 'minutely,alerts',
                                                     'units': 'metric', 'APPID': WAPIKEY}).json()
        except:
            print(traceback.format_exc())
            weathers = None

        if weathers is None:
            print('No weather from API!')
            return

        # Partition the three kinds of weather data.
        c, hours, days = weathers.get('current'), weathers.get('hourly'), weathers.get('daily')

        if c is None:
            print('No current weather from API!')
            return

        # Parse the current weather for update time.
        current_weather_time = dt.datetime.fromtimestamp(int(c.get('dt')), tz=pytz.timezone('Europe/Dublin'))

        # Hourly weather
        new_models = []
        weather_desc = c['weather'][0]['description']
        if 'rain' in weather_desc.lower() or 'drizzle' in weather_desc.lower():
            rain_bool = 1
        else:
            rain_bool = 0

        new_models.append(Current(future_dt=current_weather_time,
                                  temp=c['temp'],
                                  feels_like=c['feels_like'],
                                  pressure=c['pressure'],
                                  humidity=c['humidity'],
                                  wind_speed=c['wind_speed'],
                                  wind_deg=c['wind_deg'],
                                  clouds=c['clouds'],
                                  weather_main=c['weather'][0]['main'],
                                  weather_desc=weather_desc,
                                  rain_bool=rain_bool,
                                  icon=c['weather'][0]['icon']))

        # Store via model called 'Current' via bulk-sync
        ret = bulk_sync(new_models=new_models,
                        batch_size=1000,
                        filters=None,
                        key_fields=('id',))  # Individuated by

        print("Results of bulk_sync to 'Current' model: {created} created, {updated} updated, {deleted} deleted."
              .format(**ret['stats']))

        # Hourly weather
        new_models = []
        for h in hours:
            weather_desc = h['weather'][0]['description']
            if 'rain' in weather_desc.lower() or 'drizzle' in weather_desc.lower():
                rain_bool = 1
            else:
                rain_bool = 0

            new_models.append(Hourly(dt=current_weather_time,
                                     future_dt=dt.datetime.fromtimestamp(int(h['dt']), tz=pytz.utc),
                                     temp=h['temp'],
                                     feels_like=h['feels_like'],
                                     pressure=h['pressure'],
                                     humidity=h['humidity'],
                                     wind_speed=h['wind_speed'],
                                     wind_deg=h['wind_deg'],
                                     clouds=h['clouds'],
                                     weather_main=h['weather'][0]['main'],
                                     weather_desc=weather_desc,
                                     rain_bool=rain_bool))

        # Store via model called 'Hourly' via bulk-sync
        ret = bulk_sync(new_models=new_models,
                        batch_size=1000,
                        filters=None,
                        key_fields=('id',))  # Individuated by

        print("Results of bulk_sync to 'Hourly' model: {created} created, {updated} updated, {deleted} deleted."
              .format(**ret['stats']))

        # Daily weather
        new_models = []
        for d in days:
            weather_desc = d['weather'][0]['description']
            if 'rain' in weather_desc.lower() or 'drizzle' in weather_desc.lower():
                rain_bool = 1
            else:
                rain_bool = 0

            new_models.append(Daily(dt=current_weather_time,
                                    future_dt=dt.datetime.fromtimestamp(int(d['dt']), tz=pytz.utc),
                                    temp=d['temp']['day'],
                                    feels_like=d['feels_like']['day'],
                                    pressure=d['pressure'],
                                    humidity=d['humidity'],
                                    wind_speed=d['wind_speed'],
                                    wind_deg=d['wind_deg'],
                                    clouds=d['clouds'],
                                    weather_main=d['weather'][0]['main'],
                                    weather_desc=weather_desc,
                                    rain_bool=rain_bool))

        # Store via model called 'Daily' via bulk-sync
        ret = bulk_sync(new_models=new_models,
                        batch_size=1000,
                        filters=None,
                        key_fields=('id',))  # Individuated by

        print("Results of bulk_sync to 'Daily' model: {created} created, {updated} updated, {deleted} deleted."
              .format(**ret['stats']))






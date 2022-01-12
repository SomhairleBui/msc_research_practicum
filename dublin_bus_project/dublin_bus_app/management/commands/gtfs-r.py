from django.core.management.base import BaseCommand
from django.core.management import call_command
from dublin_bus_app.models import Times, Today, Current, Hourly, Daily
from tourist.models import TouristInfoGroup
from datetime import datetime as dt
from datetime import timedelta
import datetime
from google.transit import gtfs_realtime_pb2
import requests
import pytz
import pandas as pd
from bulk_sync import bulk_sync  # See docs at: https://pypi.org/project/django-bulk-sync/
import time
import os
import pickle
from dublin_bus_app.dbinfo import *


class Command(BaseCommand):
    help = 'Gets GTFS-R feed data, modifies timetable, and stores in model'

    def handle(self, *args, **kwargs):
        now = dt.now(tz=pytz.timezone('Europe/Dublin'))
        day_name = now.strftime('%A').lower()  # Get the day name
        date = now.date()

        # Does tourist need to be initialised?
        if not TouristInfoGroup.objects.filter(name='activities').first():
            call_command('tourist')
            tourist_status = date + timedelta(days=7)
            pickle.dump(tourist_status, open('dublin_bus_app/data/tourist_status.pickle', 'wb'))

        # Only update once a day
        if os.path.isfile('dublin_bus_app/data/date_status.pickle'):
            date_status = pickle.load(open('dublin_bus_app/data/date_status.pickle', 'rb'))
            if date != date_status:
                call_command('today')
                call_command('routes')
            else:
                print('Timetable and Routes are up to date for:', day_name, date)
        else:
            call_command('today')
            call_command('routes')

        now = dt.now(tz=pytz.timezone('Europe/Dublin'))
        prev_time = now.time()

        # Clear some tables
        Times.objects.all().delete()
        Current.objects.all().delete()
        Hourly.objects.all().delete()
        Daily.objects.all().delete()

        first = True  # First loop
        while True:
            # Get the datetime for now
            now = dt.now(tz=pytz.timezone('Europe/Dublin'))
            now_time = now.time()

            # Update weather every 5 mins
            if first or now >= prev_weather + timedelta(minutes=5):
                call_command('weather')
                print('WEATHER FINISHED')
                prev_weather = now
                first = False

            # Update the schedule in the dead of night.
            if (datetime.time(2, 50, 0) <= prev_time <= datetime.time(2, 59, 59) and
                    datetime.time(3, 0, 0) <= now_time <= datetime.time(3, 10, 0)):
                call_command('today')
                call_command('routes')
                call_command('weather')
                print('WEATHER FINISHED')

                # Update tourist once a week
                if os.path.isfile('dublin_bus_app/data/tourist_status.pickle'):
                    tourist_status = pickle.load(open('dublin_bus_app/data/tourist_status.pickle', 'rb'))
                    if tourist_status <= now.date():
                        call_command('tourist')
                        tourist_status += timedelta(days=7)
                        pickle.dump(tourist_status, open('dublin_bus_app/data/tourist_status.pickle', 'wb'))

            prev_time = now_time

            df_times = pd.DataFrame()
            # Get today's schedule
            print('Getting Schedule', end='')
            while df_times.empty:
                print('.', end='')
                try:
                    df_times = pd.DataFrame.from_records(Today.objects.all().values())
                except Exception as e:
                    print(e)
                    continue
                time.sleep(1)
            print()

            # Use the GTFS feed to modify the schedule
            real = True
            if real:
                # Speed things up by just operating on a reduced window of times around now.
                print('STARTING GTFS', now)
                time_mask = ((df_times['arrival_time'] >= (now - timedelta(seconds=1800))) &
                             (df_times['arrival_time'] <= (now + timedelta(seconds=2700))))
                df_times = df_times[time_mask]

                # GTFS feed headers and Endpoints
                headers = {'Cache-Control': 'no-cache', 'x-api-key': GTFSAPIKEY}

                test = 'https://api.nationaltransport.ie/gtfsrtest/'
                gtfsr = 'https://gtfsr.transportforireland.ie/v1/'

                # Setup the FeedMessage
                feed = gtfs_realtime_pb2.FeedMessage()
                # Get the GTFS-R data
                response = requests.get(gtfsr, None, headers=headers)
                print(response)
                # Parse the binary response
                feed.ParseFromString(response.content)
                print('TIMESTAMP', feed.header.timestamp)  # Timestamp of data collected
                for entity in feed.entity:
                    if entity.HasField('trip_update'):
                        # If the trip_id is one we are interested in (is in dataframe) then...
                        trip_id = entity.trip_update.trip.trip_id
                        if trip_id in df_times.trip_id.values:
                            if entity.trip_update.trip.schedule_relationship != 0:  # If not SCHEDULED
                                if entity.trip_update.trip.schedule_relationship == 3:  # If CANCELED
                                    df_times = df_times[df_times.trip_id != trip_id]  # Remove trip
                                    continue

                            for update in entity.trip_update.stop_time_update:  # For each stop time update
                                # Update the appropriate times for that trip_id and stop_id in the dataframe
                                stop_id = update.stop_id.split('_')[0]
                                stop_id = stop_id[-6:].lstrip('DBR0')
                                if ':' in stop_id:
                                    stop_id = 0

                                condition = ((df_times['trip_id'] == trip_id) &
                                             (df_times['stop_id'] == stop_id))
                                df_times.loc[condition, 'arrival_time'] = (df_times.loc[condition, 'arrival_time'] +
                                                                           timedelta(seconds=int(update.arrival.delay)))
                                df_times.loc[condition, 'departure_time'] = (df_times.loc[condition, 'departure_time'] +
                                                                           timedelta(seconds=int(update.departure.delay)))

                print('FINISHED GTFS')

            # Store dataframe via model called 'Times' via bulk-sync
            new_models = [Times(stop_id=row.stop_id,
                                trip_id=row.trip_id,
                                arrival_time=row.arrival_time,
                                departure_time=row.departure_time,
                                shape_dist=row.shape_dist) for row in df_times.itertuples()]

            # Sync and return stats
            ret = bulk_sync(new_models=new_models,
                            batch_size=100000,
                            filters=None,
                            fields=['stop_id', 'trip_id', 'arrival_time', 'departure_time', 'shape_dist'],
                            key_fields=('stop_id', 'trip_id'))  # Individuated by stop and trip ids.

            print("Results of bulk_sync to 'Times' model: {created} created, {updated} updated, {deleted} deleted."
                  .format(**ret['stats']))

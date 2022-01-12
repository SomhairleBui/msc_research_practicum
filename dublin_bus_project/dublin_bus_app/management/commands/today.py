from django.core.management.base import BaseCommand
from datetime import datetime as dt
from datetime import timedelta
import pytz
import pandas as pd
from bulk_sync import bulk_sync  # See docs at: https://pypi.org/project/django-bulk-sync/
from dublin_bus_app.models import Today
import requests
from zipfile import ZipFile
import time


class Command(BaseCommand):
    help = 'Gets today\'s timetable'

    def handle(self, *args, **kwargs):
        now = dt.now(tz=pytz.timezone('Europe/Dublin'))
        day_name = now.strftime('%A').lower()  # Get the day name
        date = now.date()

        date_int = int(str(date).replace('-', ''))  # Remove the hyphens from the date
        print('Building timetable for:', day_name, date)

        yesterday = now - timedelta(days=1)
        yesterday_name = yesterday.strftime('%A').lower()  # Get yesterday's name
        yesterdate = yesterday.date()
        yesterdate_int = int(str(yesterdate).replace('-', ''))  # Remove the hyphens from the date

        # Download the latest timetables
        no_file = True
        counter = 1
        while no_file and counter < 10:
            try:
                url = 'https://www.transportforireland.ie/transitData/google_transit_combined.zip'
                r = requests.get(url)
                with open('dublin_bus_app/data/gtfs.zip', 'wb') as outfile:
                    outfile.write(r.content)
                print('Timetable Downloaded')
                no_file = False
            except Exception as e:
                counter += 1
                print(e)
                print('ERROR: Unable to download latest GTFS timetable.')
                time.sleep(counter**2)

        # Read directly from the zip.
        with ZipFile('dublin_bus_app/data/gtfs.zip', 'r') as z:
            df = pd.read_csv(z.open('calendar.txt'))
            df_dates = pd.read_csv(z.open('calendar_dates.txt'))

        # Get today's excluded service exceptions
        exceptions = df_dates.loc[(df_dates.date == str(date_int)) &
                                  (df_dates.exception_type == 2), 'service_id']

        # Get just today's services
        df_services = df.loc[((df['start_date'] <= date_int) &
                              (df['end_date'] >= date_int) &
                              (df[day_name] == 1) &
                              (~df['service_id'].isin(exceptions))), 'service_id']

        # Get today's included service exceptions
        exceptions = df_dates.loc[((df_dates.exception_type == 1) &
                                   (df_dates.date == str(date_int))), 'service_id']
        df_services.append(exceptions)

        # Get yesterday's excluded service exceptions
        exceptions = df_dates.loc[((df_dates.date == str(yesterdate_int)) &
                                   (df_dates.exception_type == 2)), 'service_id']

        # Get just yesterday's services
        df_yesterday_services = df.loc[((df['start_date'] <= yesterdate_int) &
                                        (df['end_date'] >= yesterdate_int) &
                                        (df[yesterday_name] == 1) &
                                        (~df['service_id'].isin(exceptions))), 'service_id']

        # Get yesterday's included service exceptions
        exceptions = df_dates.loc[((df_dates.exception_type == 1) &
                                   (df_dates.date == str(yesterdate_int))), 'service_id']
        df_yesterday_services.append(exceptions)

        # Read from the zip, routes and trips
        with ZipFile('dublin_bus_app/data/gtfs.zip', 'r') as z:
            df = pd.read_csv(z.open('routes.txt'))
            df_trips = pd.read_csv(z.open('trips.txt'))

        # Get the Dublin Bus and Go Ahead routes
        df_routes = df[df['agency_id'].isin(['978', '03'])]

        # Select the trips that correspond to today's services and the bus routes.
        df_today_trips = df_trips[df_trips['route_id'].isin(df_routes['route_id']) &
                                  df_trips['service_id'].isin(df_services)]

        # Select the trips that correspond to yesterday's services and the bus routes.
        df_yesterday_trips = df_trips[df_trips['route_id'].isin(df_routes['route_id']) &
                                      df_trips['service_id'].isin(df_yesterday_services)]

        # Get the stop times corresponding to the trips.
        with ZipFile('dublin_bus_app/data/gtfs.zip', 'r') as z:
            df_times = pd.read_csv(z.open('stop_times.txt'), dtype='string')
        df_times = df_times[['stop_id', 'trip_id', 'arrival_time', 'departure_time', 'shape_dist_traveled']]
        df_today_times = df_times[df_times['trip_id'].isin(df_today_trips.trip_id)].copy()

        # Convert to datetime
        df_today_times['arrival_time'] = (pd.to_datetime(date.strftime('%Y-%m-%d ')) +
                                          pd.to_timedelta(df_today_times['arrival_time']))
        df_today_times['arrival_time'] = df_today_times['arrival_time'].dt.tz_localize(pytz.timezone('Europe/Dublin'))

        df_today_times['departure_time'] = (pd.to_datetime(date.strftime('%Y-%m-%d ')) +
                                            pd.to_timedelta(df_today_times['departure_time']))
        df_today_times['departure_time'] = df_today_times['departure_time'].dt.tz_localize(pytz.timezone('Europe/Dublin'))

        # Get the stop times corresponding to yesterday's trips, after midnight.
        df_yesterday_times = df_times[df_times['trip_id'].isin(df_yesterday_trips.trip_id)].copy()
        df_yesterday_times['arrival_time'] = (pd.to_datetime(yesterdate.strftime('%Y-%m-%d ')) +
                                              pd.to_timedelta(df_yesterday_times['arrival_time']))
        df_yesterday_times['arrival_time'] = (df_yesterday_times['arrival_time']
                                              .dt.tz_localize(pytz.timezone('Europe/Dublin')))

        # Get just yesterday's times that are actually in today.
        df_yesterday_times = df_yesterday_times[df_yesterday_times['arrival_time'].dt.date == date]

        # Convert remainder to datetime
        df_yesterday_times['departure_time'] = (pd.to_datetime(yesterdate.strftime('%Y-%m-%d ')) +
                                                pd.to_timedelta(df_yesterday_times['departure_time']))
        df_yesterday_times['departure_time'] = (df_yesterday_times['departure_time']
                                                .dt.tz_localize(pytz.timezone('Europe/Dublin')))

        # Concatenate dataframes and save to Today model
        df = pd.concat([df_today_times, df_yesterday_times])

        # Reduce stop_id to match historical database
        df['stop_id'] = df['stop_id'].str.split('_').str[0]  # Deal with mangled _merged_ stop ids.
        # Final six numbers, strip any leading Ds Bs Rs and zeros.
        df['stop_id'] = df['stop_id'].str.slice(-6).str.lstrip('DBR0')
        # Some stops_ids are generated; zero them.
        condition = df['stop_id'].str.contains(':', regex=False)
        df.loc[condition, 'stop_id'] = 0

        Today.objects.all().delete()

        # Store dataframe via model called 'Today' via bulk-sync
        new_models = [Today(stop_id=row['stop_id'],
                            trip_id=row['trip_id'],
                            arrival_time=row['arrival_time'],
                            departure_time=row['departure_time'],
                            shape_dist=row['shape_dist_traveled']) for i, row in df.iterrows()]

        # Sync and return stats
        ret = bulk_sync(new_models=new_models,
                        batch_size=100000,
                        filters=None,
                        fields=['stop_id', 'trip_id', 'arrival_time', 'departure_time', 'shape_dist'],
                        key_fields=('stop_id', 'trip_id'))  # Individuated by stop and trip ids.

        print("Results of bulk_sync to 'Today' model: {created} created, {updated} updated, {deleted} deleted."
              .format(**ret['stats']))
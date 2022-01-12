from django.core.management.base import BaseCommand
import pandas as pd
import pickle
from zipfile import ZipFile
from datetime import datetime as dt
import pytz
import collections

pd.options.display.width = 200
pd.set_option('display.max_columns', 100)
pd.set_option('display.max_rows', 9000)


class Command(BaseCommand):
    help = 'Gets today\'s routes'

    def handle(self, *args, **kwargs):
        print('Getting routes and stops...')
        # Get the Dublin Bus and Go Ahead routes.
        with ZipFile('dublin_bus_app/data/gtfs.zip', 'r') as z:
            df = pd.read_csv(z.open('routes.txt'))
        df_routes = df[df['agency_id'].isin(['978', '03'])]

        # Select the trips that correspond to the bus routes.
        with ZipFile('dublin_bus_app/data/gtfs.zip', 'r') as z:
            df = pd.read_csv(z.open('trips.txt'))
        # df_trips = df[df['route_id'].isin(df_routes['route_id'])]
        df_trips = df[['route_id', 'trip_id',
                       'direction_id']].merge(df_routes[['route_id', 'route_short_name', 'route_long_name']],
                                              on='route_id', how='inner')

        # Get the stop times corresponding to the trips.
        with ZipFile('dublin_bus_app/data/gtfs.zip', 'r') as z:
            df = pd.read_csv(z.open('stop_times.txt'), dtype='string')
        df_stop_times = df[df['trip_id'].isin(df_trips.trip_id)]

        # Get the hop distances
        df_stop_times = df_stop_times.rename(columns={'shape_dist_traveled': 'shape_dist'})
        df_stop_times = df_stop_times.astype({'shape_dist': 'float64'})
        df_stop_times['hop_dist'] = df_stop_times['shape_dist'].diff()
        condition = df_stop_times['stop_sequence'] == '1'
        df_stop_times.loc[condition, 'hop_dist'] = 0
        condition = df_stop_times['stop_sequence'] == '2'
        df_stop_times.loc[condition, 'hop_dist'] = df_stop_times.loc[condition, 'shape_dist']
        df_stop_times = df_stop_times.round({'shape_dist': 0, 'hop_dist': 0})

        # Zero the prev_stop of all matched rows, in preparation.
        df_stop_times['prev_stop'] = 0

        # Iterate through the trips
        outframes = []
        trips = df_stop_times.groupby(by='trip_id')
        for i, done in trips:
            # Calculate the hop times and previous stops.
            done.sort_values(by='stop_sequence', inplace=True)
            done['prev_stop'] = done['stop_id'].shift(1)
            outframes.append(done)

        df_stop_times = pd.concat(outframes)
        df_stop_times['route_id'] = df_stop_times['trip_id'].str.split('.').str[2]
        df_stop_times['route_var'] = df_stop_times['trip_id'].str.split('.').str[3]
        inbound = df_stop_times['trip_id'].str.split('.').str[-1] == 'I'
        outbound = df_stop_times['trip_id'].str.split('.').str[-1] == 'O'
        df_stop_times.loc[inbound, 'direction'] = '1'
        df_stop_times.loc[outbound, 'direction'] = '0'

        # Reduce stop_id to match historical database;
        df_stop_times['stop_id'] = df_stop_times['stop_id'].str.split('_').str[0] # Deal with mangled _merged_ stop ids.
        # Final six numbers, strip any leading Ds Bs Rs and zeros.
        df_stop_times['stop_id'] = df_stop_times['stop_id'].str.slice(-6).str.lstrip('DBR0')
        # Some stops_ids are generated; zero them.
        condition = df_stop_times['stop_id'].str.contains(':', regex=False)
        df_stop_times.loc[condition, 'stop_id'] = 0

        df_hops = df_stop_times[['route_id', 'route_var', 'direction', 'prev_stop', 'stop_id',
                                 'stop_sequence', 'shape_dist', 'hop_dist']].drop_duplicates()

        hops = {}
        for row in df_hops.itertuples():
            key = (row.route_id, row.route_var, row.direction, row.stop_id)
            hops[key] = (row.stop_sequence, row.shape_dist, row.hop_dist)
        print('Sequence and dist dictionary compiled.')

        # Get the stop ids for the routes
        df_stops = df_trips[['route_short_name',
                             'route_long_name',
                             'direction_id',
                             'trip_id']].merge(df_stop_times[['trip_id',
                                                              'route_id',
                                                              'route_var',
                                                              'stop_sequence',
                                                              'stop_id']], on='trip_id', how='left')

        # Get the shape_ids
        df_shapes = pd.DataFrame(columns=['shape_id', ])
        df_shapes['shape_id'] = df_stops['trip_id'].str.split('.', 2).str[2]
        df_shapes = df_shapes.drop_duplicates()

        with ZipFile('dublin_bus_app/data/gtfs.zip', 'r') as z:
            df = pd.read_csv(z.open('shapes.txt'))
        df_shapes = df[df['shape_id'].isin(df_shapes['shape_id'])]

        # Create a shapes dict
        shapes = {}
        for row in df_shapes.itertuples():
            row_dic = {'shape_dist': row.shape_dist_traveled,
                       'seq': row.shape_pt_sequence,
                       'lat': row.shape_pt_lat,
                       'lon': row.shape_pt_lon}

            if row.shape_id in shapes:
                shapes[row.shape_id].append(row_dic)
            else:
                shapes[row.shape_id] = [row_dic, ]

        # Pickle the shapes.
        pickle.dump(shapes, open('dublin_bus_app/data/shapes.pickle', 'wb'))
        print('Shapes pickled')

        # Get just the needed columns
        df_stops = df_stops[['route_short_name', 'route_long_name', 'route_id',
                             'route_var', 'direction_id', 'stop_sequence', 'stop_id']]

        # Add direction to the name and keep line_id (reduced to a single id, without hyphen).
        df_stops['line_id'] = df_stops['route_short_name'].str.split('-').str[0]
        condition = df_stops['direction_id'] == 1
        df_stops.loc[condition, 'route_short_name'] = df_stops.loc[condition, 'route_short_name'] + ' Inbound'
        df_stops.loc[~condition, 'route_short_name'] = df_stops.loc[~condition, 'route_short_name'] + ' Outbound'

        # Remove unecessary info.
        df_stops = df_stops.drop_duplicates()

        # Dictify
        routes = {}
        locations = {}
        stops = set()

        df_stops = df_stops.astype({'stop_sequence': 'int64'})
        df_stops.sort_values(by='stop_sequence', inplace=True)

        for row in df_stops.itertuples():
            stops.add(row.stop_id)  # Get the set of relevant stops at the same time
            key = f"{row.route_short_name},{row.route_long_name},{row.route_id},{row.route_var},{row.direction_id}"
            if key in routes:
                routes[key].append(row.stop_id)
            else:
                routes[key] = [row.stop_id]

            # For finding the stop on a route, nearest to a location (Google directions)
            if row.line_id in locations:
                locations[row.line_id].add(row.stop_id)
            else:
                locations[row.line_id] = {row.stop_id}

        route_keys = list(routes.keys())
        route_keys.sort(key=lambda x: (self.sorter(x), x))  # Usually sort by bus line int first.
        routes = {k: routes[k] for k in route_keys}

        # Remove routes that are subsets of other routes with the same line_id
        for route in routes.copy():
            for r in routes.copy():
                if r == route:
                    continue
                elif r.split(' ')[0].split('-')[0] == route.split(' ')[0].split('-')[0]:
                    stop_ids = set(routes[route])
                    other_ids = set(routes[r])
                    if stop_ids.issubset(other_ids):
                        del routes[route]
                        break

        # Compile inverted index of routes
        iindex = collections.defaultdict(set)
        for route in routes:
            for stop in routes[route]:  # Add a route to the inverted index for each (line_id, stop) tuple
                line_id = route.split(' ')[0].split('-')[0]
                iindex[(line_id, stop)].add(route)

        # Pickle the inverted index.
        pickle.dump(iindex, open('dublin_bus_app/data/iindex.pickle', 'wb'))
        print('Routes inverted index pickled')

        # Get the stop info
        with ZipFile('dublin_bus_app/data/gtfs.zip', 'r') as z:
            df = pd.read_csv(z.open('stops.txt'))

        # Reduce stop_id to match historical database;
        df['stop_id'] = df['stop_id'].str.split('_').str[0]  # Deal with mangled _merged_ stop ids.
        # Final six numbers, strip any leading Ds Bs Rs and zeros.
        df['stop_id'] = df['stop_id'].str.slice(-6).str.lstrip('DBR0')
        # Some stops_ids are generated; zero them.
        condition = df['stop_id'].str.contains(':', regex=False)
        df.loc[condition, 'stop_id'] = 0

        df = df[df['stop_id'].isin(stops)]  # Dublin stops for the routes above

        stops = {}
        stops_lat = {}
        stops_lon = {}
        for row in df.itertuples():
            # Compile stops dict
            stop = {row.stop_id: {'stop_id': row.stop_id,
                                  'stop_name': row.stop_name,
                                  'stop_lat': row.stop_lat,
                                  'stop_lon': row.stop_lon}}
            stops.update(stop)

            # Complie seperate lat and lon dicts
            stop = {row.stop_id: row.stop_lat}
            stops_lat.update(stop)

            stop = {row.stop_id: row.stop_lon}
            stops_lon.update(stop)

        # Compile the stop information for each route.
        for r in locations.keys():
            locations[r] = [stops[stop_id] for stop_id in locations[r]]

        # Pickle the stops_lat and _lon dicts
        pickle.dump(stops_lat, open('dublin_bus_app/data/gtfs_stops_lat.pickle', 'wb'))
        pickle.dump(stops_lon, open('dublin_bus_app/data/gtfs_stops_lon.pickle', 'wb'))
        print('Stops_lat and _lon pickled')

        # Pickle the stops dict.
        pickle.dump(stops, open('dublin_bus_app/data/stops.pickle', 'wb'))
        print('Stops pickled')

        # Pickle the locations dict.
        pickle.dump(locations, open('dublin_bus_app/data/locations.pickle', 'wb'))
        print('Locations pickled')

        # Pickle the routes dict.
        pickle.dump(routes, open('dublin_bus_app/data/routes.pickle', 'wb'))
        print('Routes pickled')

        # Pickle the hop_dists
        pickle.dump(hops, open('dublin_bus_app/data/hops.pickle', 'wb'))
        print('Hops pickled')

        # Once a day
        now = dt.now(tz=pytz.timezone('Europe/Dublin'))
        date = now.date()
        date_status = date
        pickle.dump(date_status, open('dublin_bus_app/data/date_status.pickle', 'wb'))

    def sorter(self, x):
        y = x.split(',')[0].split(' ')[0].split('-')[0].rstrip('ABCDEX')
        if not y[0].isdigit():
            return 99999999, y[0], int(y[1:]), x
        else:
            return int(y), x
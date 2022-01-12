import pickle
from glob import glob
from zipfile import ZipFile
import pandas as pd

# zipfiles = glob('./2018/*')
#
# first = True
# for fname in zipfiles:
#     with ZipFile(fname, 'r') as z:
#         print(fname, flush=True)  # Print the file name
#
#         df = pd.read_csv(z.open('stops.txt'))
#         df = df[['stop_id', 'stop_lat', 'stop_lon']]
#         if first:
#             first = False
#             df_prev = df
#             continue
#
#         df_prev = pd.concat([df, df_prev])
#         df_prev.drop_duplicates(keep='last', inplace=True)
#
# df_prev.to_csv('2018_stops')
df_prev = pd.read_csv('2018_stops')
df_prev.drop_duplicates(subset=['stop_id'], keep='last', inplace=True)
print(df_prev.shape[0])

df = df_prev

# Reduce stop_id to match historical database;
df['stop_id'] = df['stop_id'].str.split('_').str[0]  # Deal with mangled _merged_ stop ids.
# Final six numbers, strip any leading Ds Bs Rs and zeros.
df['stop_id'] = df['stop_id'].str.slice(-6).str.lstrip('DBR0')
# Some stops_ids are generated; zero them.
condition = df['stop_id'].str.contains(':', regex=False)
df.loc[condition, 'stop_id'] = 0

df = df[df['stop_id'] != 0]

stops_lat = {}
stops_lon = {}

for row in df.itertuples():
    # Compile stops dicts
    stop = {row.stop_id: row.stop_lat}
    stops_lat.update(stop)

    stop = {row.stop_id: row.stop_lon}
    stops_lon.update(stop)

df_old = df

with ZipFile('gtfs.zip', 'r') as z:
    df = pd.read_csv(z.open('stops.txt'))
    df = df[['stop_id', 'stop_lat', 'stop_lon']]

    # Reduce stop_id to match historical database;
    df['stop_id'] = df['stop_id'].str.split('_').str[0]  # Deal with mangled _merged_ stop ids.
    # Final six numbers, strip any leading Ds Bs Rs and zeros.
    df['stop_id'] = df['stop_id'].str.slice(-6).str.lstrip('DBR0')
    # Some stops_ids are generated; zero them.
    condition = df['stop_id'].str.contains(':', regex=False)
    df.loc[condition, 'stop_id'] = 0
    df = df[df['stop_id'] != 0]

    for row in df.itertuples():
        if row.stop_id in df_old.stop_id.values:
            'ALREADY'
            continue
        print(row.stop_id)
        stop = {row.stop_id: row.stop_lat}
        stops_lat.update(stop)

        stop = {row.stop_id: row.stop_lon}
        stops_lon.update(stop)
        print('ADDED FROM RECENT GTFS')

pickle.dump(stops_lat, open('stops_lat.pickle', 'wb'))
pickle.dump(stops_lon, open('stops_lon.pickle', 'wb'))
print('Stops pickled')
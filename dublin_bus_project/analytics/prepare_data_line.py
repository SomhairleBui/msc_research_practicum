import numpy as np
import pandas as pd
from sqlalchemy import create_engine
from datetime import timedelta
from datetime import datetime as dt
import pickle
import smtplib
import ssl
from email.message import EmailMessage
import traceback
from glob import glob
import joblib
from sklearn.preprocessing import MinMaxScaler
from sklearn.preprocessing import OrdinalEncoder
from geopy.distance import great_circle as gc
import os

EMAIL = "ec2scrape@gmail.com"
SEND_TO = "ec2scrape@gmail.com"
EMAIL_PASS = 'RObRamW$UcH3_rOmoc3?'

pd.options.display.width = 100
pd.set_option('display.max_columns', 100)
pd.set_option('display.max_rows', 100)


def main():
    engine = create_engine("mysql+mysqlconnector://team16:6pT7xqWF3VK68fmP@localhost/team16")
    conn = engine.connect()

    print(dt.now(), flush=True)

    # df = pd.read_sql(f"""SELECT * FROM team16.masters
    #                         WHERE `date` between '2018-{month}-01' AND LAST_DAY('2018-{month}-01')""", con=conn)

    df = pd.read_sql(f"""SELECT * FROM team16.masters
                            WHERE `line_id` = 16 """, con=conn)

    print(df.shape[0])
    print('Finished Bus SQL', flush=True)

    condition = df['actual_arrival_time'] >= 86400
    df.loc[condition, 'date'] = (pd.to_datetime(df.loc[condition, 'date']) + timedelta(days=1)).dt.date
    df['weather_time'] = pd.to_timedelta(-(((df['actual_arrival_time'] % 86400) // 1800) // -2) % 24, unit='h')
    df['weather_time'] = pd.to_datetime(df['date']) + df['weather_time']

    df['weather_time'] = df['weather_time'].dt.strftime('%Y-%m-%d %H:%M:%S')
    df_w = df.drop_duplicates(subset=['weather_time'])

    sql = """SELECT * FROM team16.historical_weather
                WHERE date in ('%s')""" % "','".join(df_w['weather_time'])

    df_w = pd.read_sql(sql, con=conn)

    print('Finished Weather SQL', flush=True)

    df = df.drop(columns=['row_id', 'db_id', 'trip_id', 'dwell_time',
                          'actual_dep_time', 'arrival_time', 'departure_time', 'direction'])
    df.dropna(inplace=True)

    df = df.astype({'prev_stop': 'float64'})  # The reason for this is that ints can't be Null.
    df['prev_stop'] = df.prev_stop.round(0).astype(int)
    df = df.astype({'line_id': 'string', 'stop_id': 'string', 'prev_stop': 'string',
                    'stop_sequence': 'int64', 'hop_time': 'int64',
                    'hop_dist': 'int64', 'shape_dist': 'int64',
                    'actual_arrival_time': 'int64', 'day_num': 'int64'})

    # Remove extreme outliers
    print(df.shape[0])
    print('98th:', np.percentile(df.hop_time, 98))
    df = df[df['hop_time'] <= np.percentile(df.hop_time, 98)]
    print('1st:', np.percentile(df.hop_time, 1))
    df = df[df['hop_time'] >= np.percentile(df.hop_time, 1)]
    print(df.shape[0])

    # Get holidays column
    df_hols = pd.read_csv('holidays.csv')
    df_hols['holiday_date'] = pd.to_datetime(df_hols['holiday_date'])
    condition = df['date'].isin(df_hols['holiday_date'])
    df['holiday'] = 0
    df.loc[condition, 'holiday'] = 1
    print('Finished holidays', flush=True)

    # Get day of week and date if time past midnight
    condition = df['actual_arrival_time'] >= 86400
    df.loc[condition, 'day_num'] = (df.loc[condition, 'day_num'] + 1) % 7
    df.loc[condition, 'date'] = (pd.to_datetime(df.loc[condition, 'date']) + timedelta(days=1)).dt.date

    # Reduce arrival time to seconds from midnight and get arrival code
    df['actual_arrival_time'] = df['actual_arrival_time'] % 86400
    df['arrival_code'] = df['actual_arrival_time'] // 1800

    # Find the nearest weather hour
    df['weather_time'] = pd.to_timedelta(-(df['arrival_code'] // -2) % 24, unit='h')
    df['weather_time'] = pd.to_datetime(df['date']) + df['weather_time']
    df.drop_duplicates(inplace=True)
    print(df.shape[0])

    # Merge with cleaned weather data
    df_w['date'] = pd.to_datetime(df_w['date'])
    df_w.drop_duplicates(subset=['date'], inplace=True)  # There are some near-duplicates in the weather data!
    df_w.rename(columns={'date': 'weather_time', 'weather_description': 'weather_desc'}, inplace=True)

    df = df.merge(df_w, on='weather_time', how='left')
    df.drop(columns=['temp_min', 'temp_max', 'midnightseconds', 'weather_time'], inplace=True)
    df.dropna(inplace=True)
    df = df.astype({'temp': 'float64', 'feels_like': 'float64', 'pressure': 'float64',
                    'humidity': 'float64', 'wind_speed': 'float64', 'wind_deg': 'float64',
                    'clouds_all': 'int64', 'rain': 'int64', 'holiday': 'int64'})

    # Convert wind_speed and wind_deg to vector
    wind_speed = df.pop('wind_speed')
    wind_rad = df.pop('wind_deg') * np.pi / 180
    df['sin_wind'] = wind_speed * np.sin(wind_rad)
    df['cos_wind'] = wind_speed * np.cos(wind_rad)

    # Convert periodic features to sin and cos values
    # Convert time of day to sin and cos time
    day = 86400
    df['sin_day'] = np.sin(2 * np.pi * df['actual_arrival_time'] / day)
    df['cos_day'] = np.cos(2 * np.pi * df['actual_arrival_time'] / day)

    # Convert time of week to sin and cos time
    week = 7
    df['sin_week'] = np.sin(2 * np.pi * df['day_num'] / week)
    df['cos_week'] = np.cos(2 * np.pi * df.pop('day_num') / week)

    # Get seconds from beginning of year
    df['date'] = pd.to_datetime(df['date'])
    df['year_secs'] = ((df['date'] + pd.to_timedelta(df['actual_arrival_time'] % day, unit='S')) -
                       (df['date'] - pd.tseries.offsets.YearBegin())).dt.total_seconds()

    # Convert time of year in seconds to sin and cos time
    year = day * 365.2425
    df['sin_year'] = np.sin(2 * np.pi * df['year_secs'] / year)
    df['cos_year'] = np.cos(2 * np.pi * df.pop('year_secs') / year)

    # Get stop locations
    stops_lat = pickle.load(open('stops_lat.pickle', 'rb'))
    stops_lon = pickle.load(open('stops_lon.pickle', 'rb'))
    df['stop_lat'] = df['stop_id'].map(stops_lat)
    df['stop_lon'] = df['stop_id'].map(stops_lon)
    df['prev_lat'] = df['prev_stop'].map(stops_lat)
    df['prev_lon'] = df['prev_stop'].map(stops_lon)
    df.dropna(inplace=True)

    print('Getting lights', flush=True)
    lights = pickle.load(open('lights_locations.pickle', 'rb'))
    if os.path.isfile('lights_dict.pickle'):
        lights_dict = pickle.load(open('lights_dict.pickle', 'rb'))
    else:
        lights_dict = {}

    # Get all the unique stop pairs
    df_u = df[['stop_lat', 'stop_lon',
               'prev_lat', 'prev_lon']].drop_duplicates(subset=['stop_lat', 'stop_lon',
                                                                'prev_lat', 'prev_lon'])
    # If there is a pair not in the dict, calculate and add it.
    for row in df_u.itertuples():
        key = ((row.stop_lat, row.stop_lon), (row.prev_lat, row.prev_lon))
        if key in lights_dict:
            continue
        num = cross(row, lights)
        lights_dict[key] = num

    # Save the dict
    pickle.dump(lights_dict, open('lights_dict.pickle', 'wb'))

    # Add a new column for lights using the dict lookup
    df['lights'] = df.apply(lambda x: lights_dict[((x['stop_lat'],
                                                    x['stop_lon']),
                                                   (x['prev_lat'],
                                                    x['prev_lon']))], axis=1)
    print('Stop the lights.')

    df = df.astype({'stop_id': 'int64', 'prev_stop': 'int64'})

    df.drop(columns=['date', 'actual_arrival_time', 'arrival_code', 'line_id', 'weather_main'], inplace=True)
    print('Saving:', df.shape[0], flush=True)
    df.to_csv(f'./months/16.csv.gz', index=False, compression='gzip')
    print('MONTH FINISHED', flush=True)


def cross(row, lights):
    stop = (row.stop_lat, row.stop_lon)
    prev = (row.prev_lat, row.prev_lon)

    # Get great circle dist between two stops
    dist = gc(stop, prev).m

    # Get the set of lights within that distance from each stop
    stop_lights = set(light for light in lights if gc(stop, light).m < dist)
    prev_lights = set(light for light in lights if gc(prev, light).m < dist)

    # Get the intersection (in both circles), and count them.
    lights_num = len(stop_lights.intersection(prev_lights))
    return lights_num

# for col in cols:
#     df[col] = pd.Categorical(df[col], categories=cats[col])
#     hot = pd.get_dummies(df[col])
#     df = pd.concat([df, hot])
#     df.drop(columns=col)

# for filename in filenames:
#     df = pd.read_csv(f'{filename}', dtype='string')
#     cats = {col: df[col].unique() for col in cols}
#     list_of_dicts.append(cats)
#
#     # Don't ask.....one dict to rule them all
# cats = {k: list(set([el for sub in [d[k] for d in list_of_dicts] for el in sub])) for k in list_of_dicts[0]}


def encode_scale():
    # Gather all the possible combinations of cats (unique values)
    print('Gathering data to encode', flush=True)

    df = pd.read_csv('./months/16.csv.gz', dtype='string')
    df = df[['weather_desc']]
    df.drop_duplicates(inplace=True)
    # if first:
    #     df_prev = df
    #     first = False
    #     continue
    # df_prev = pd.concat([df_prev, df]).drop_duplicates()

    # Fit one encoder to rule them all
    print('Fitting Encoder', flush=True)
    encoder = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
    encoder.fit(df[['weather_desc']])
    joblib.dump(encoder, './train/encoder')

    # Instantiate scalers
    scaler_x_train = MinMaxScaler()
    scaler_y_train = MinMaxScaler()
    scaler_x_val = MinMaxScaler()
    scaler_y_val = MinMaxScaler()

    encoder = joblib.load('./train/encoder')

    # Encode the columns of each csv and save
    print('Encoding cats and fitting scalers', flush=True)
    n_train_rows = 0
    df = pd.read_csv(f'./months/16.csv.gz', dtype='string')
    df[['weather_desc']] = encoder.transform(df[['weather_desc']])
    df.to_csv(f'./months/16.csv.gz', index=False, compression='gzip')
    # y = pd.DataFrame(df.pop('hop_time'))

    train_test_split = 0.8

    df_train = df.iloc[:int(df.shape[0]*train_test_split)]
    df_test = df.iloc[int(df.shape[0]*train_test_split):]
    df_train = df_train.iloc[:int(df_train.shape[0]*train_test_split)]
    df_val = df_train.iloc[int(df_train.shape[0]*train_test_split):]
    df_train.to_csv(f'./months/16_train.csv.gz', index=False, compression='gzip')
    df_val.to_csv(f'./months/16_val.csv.gz', index=False, compression='gzip')
    df_test.to_csv(f'./months/16_test.csv.gz', index=False, compression='gzip')

    # Fitting scalers
    n_train_rows += df_train.shape[0]
    y = pd.DataFrame(df_train.pop('hop_time'))
    scaler_y_train.partial_fit(y)
    scaler_x_train.partial_fit(df_train)

    n_val_rows = df_val.shape[0]
    y_v = pd.DataFrame(df_val.pop('hop_time'))
    scaler_y_val.partial_fit(y_v)
    scaler_x_val.partial_fit(df_val)

    # Save scalers
    print('Saving scalers', flush=True)
    joblib.dump(scaler_x_train, './train/scaler_x_train')
    joblib.dump(scaler_y_train, './train/scaler_y_train')
    joblib.dump(scaler_x_val, './train/scaler_x_val')
    joblib.dump(scaler_y_val, './train/scaler_y_val')

    # Save number of rows
    print('Saving number of rows', flush=True)
    joblib.dump(n_train_rows, './train/n_train_rows')
    joblib.dump(n_val_rows, './train/n_val_rows')


def email_exception(trace):
    """Function to email an exception trace to the developer. Takes traceback.format_exc() as input."""

    print(trace, flush=True)
    message = EmailMessage()
    message.set_content(f'{trace}')
    message['Subject'] = 'Exception'
    message['From'] = 'HPS'
    message['To'] = SEND_TO

    with smtplib.SMTP_SSL("smtp.gmail.com", context=ssl.create_default_context()) as server:
        try:
            server.login(EMAIL, EMAIL_PASS)
            server.send_message(message)
        except:
            print(traceback.format_exc(), flush=True)


if __name__ == '__main__':
    try:
        main()
        encode_scale()
    except:
        email_exception(traceback.format_exc())
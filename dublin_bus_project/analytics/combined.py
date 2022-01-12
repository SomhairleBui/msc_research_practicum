from glob import glob
import pandas as pd
from zipfile import ZipFile
from datetime import datetime as dt
from datetime import timedelta
from sqlalchemy import create_engine
import sqlalchemy
import smtplib
import ssl
from email.message import EmailMessage
import traceback
import numpy as np

EMAIL = "ec2scrape@gmail.com"
SEND_TO = "ec2scrape@gmail.com"
EMAIL_PASS = 'RObRamW$UcH3_rOmoc3?'


engine = create_engine("mysql+mysqlconnector://team16:6pT7xqWF3VK68fmP@localhost/team16", pool_recycle=3600)
conn = engine.connect()

pd.options.display.width = 200
pd.set_option('display.max_columns', 100)
pd.set_option('display.max_rows', 100)

# Start and end dates of service on row
year_start = dt.strptime('20181019', '%Y%m%d').date()
year_end = dt.strptime('20190101', '%Y%m%d').date()

current = year_start


def main():
    print('BEGIN', flush=True)

    zipfiles = glob('./2018/*')

    # Iterate over the range of dates
    global current
    while current < year_end:
        print(dt.now(), current, flush=True)

        sql = f"""
            SELECT `trip_id`, `day_of_service`, `line_id`, `direction`, `stop_sequence`, `stop_id`,
            `planned_arrival_time`, `actual_arrival_time`, `planned_dep_time`, `actual_dep_time`,
            `dwell_time`
            FROM team16.historical_leavetimes
            WHERE `day_of_service` = '{current} 00:00:00';
            """
        # `trip_id`, `day_of_service`, `line_id`, `direction`, `stop_sequence`, `stop_id`,
        # `planned_arrival_time`, `actual_arrival_time`, `planned_dep_time`, `actual_dep_time`,
        # `dwell_time`, `hop_time`, `prev_stop`, `shape_dist`, `hop_dist`, `supressed`, `justificationid`

        df = pd.read_sql(sql, con=conn)
        original = df.shape[0]
        print('MYSQL', original, flush=True)

        if original == 0:
            current += timedelta(days=1)  # Next day
            continue

        df = df.astype({'line_id': 'string', 'stop_id': 'int64',
                        'direction': 'int64', 'stop_sequence': 'int64'})

        # Make the dwell time of the first stop in the sequence equal the actual_dep_time - departure_time
        condition = df['stop_sequence'] == 1
        df.loc[condition, 'dwell_time'] = (df.loc[condition, 'dwell_time'] +
                                                 (df.loc[condition, 'actual_dep_time'] -
                                                  df.loc[condition, 'planned_dep_time']))

        frames = []
        for fname in zipfiles:
            with ZipFile(fname, 'r') as z:
                print(fname, flush=True)  # Print the file name

                # Is the file relevant to the current day?
                df_calendar = pd.read_csv(z.open('calendar.txt'))
                min_date = dt.strptime(str(df_calendar['start_date'].min()), '%Y%m%d').date()
                max_date = dt.strptime(str(df_calendar['end_date'].max()), '%Y%m%d').date()
                if current > max_date or current < min_date:
                    continue

                # Read the files from the zip
                df_dates = pd.read_csv(z.open('calendar_dates.txt'))
                df_times = pd.read_csv(z.open('stop_times.txt'))

                data = []  # To create a new dataframe of services and their dates
                for row in df_calendar.itertuples():  # Iterate over the rows (services) of the calendar
                    # Start and end dates of service on row
                    start_date = dt.strptime(str(row.start_date), '%Y%m%d').date()
                    end_date = dt.strptime(str(row.end_date), '%Y%m%d').date()

                    # Is current in the range?
                    if current > end_date or current < start_date:
                        continue

                    # Get the dates of the removed service exceptions
                    exceptions = df_dates.loc[(df_dates.service_id == row.service_id) &
                                              (df_dates.exception_type == 2), 'date'].values
                    exceptions = [dt.strptime(str(e), '%Y%m%d').date() for e in exceptions]

                    # Is current an exception?
                    if current in exceptions:
                        continue

                    day_name = current.strftime('%A').lower()  # Get the day name
                    # If it's the correct day of the week and not an exception
                    if getattr(row, day_name) == 1:
                        data.append([row.service_id, current])  # Append service_id and date

                # Append the added extra services
                exceptions = df_dates.loc[df_dates.exception_type == 1, ['service_id', 'date']].values
                for e in exceptions:
                    if dt.strptime(str(e[1]), '%Y%m%d').date() == current:
                        data.append([e[0], dt.strptime(str(e[1]), '%Y%m%d').date()])

                # Create a dataframe of service_id and dates
                df_service = pd.DataFrame(data, columns=['service_id', 'date'])
                # Get service_ids and merge on them.
                df_times['service_id'] = df_times['trip_id'].str.split('.').str[1]
                # inner join it with the services for the date
                df_times = df_times.merge(df_service, on='service_id', how='inner')
                # If there's no matches, then skip to next file.
                if df_times.shape[0] == 0:
                    continue
                frames.append(df_times)

        # All the relevant timetable information for current day
        df_times = pd.concat(frames)

        # Drop the service_id
        df_times.drop(columns=['service_id', 'pickup_type', 'drop_off_type', 'stop_headsign'], inplace=True)

        # Rename long column names
        df_times.rename(columns={'shape_dist_traveled': 'shape_dist'}, inplace=True)
        df.rename(columns={'day_of_service': 'date', 'trip_id': 'db_id',
                           'planned_dep_time': 'departure_time',
                           'planned_arrival_time': 'arrival_time'}, inplace=True)

        # Get the hop distances
        df_times['hop_dist'] = df_times['shape_dist'].diff()
        condition = df_times['stop_sequence'] == 1
        df_times.loc[condition, 'hop_dist'] = 0
        condition = df_times['stop_sequence'] == 2
        df_times.loc[condition, 'hop_dist'] = df_times.loc[condition, 'shape_dist']

        # Times to time deltas in seconds
        df_times['arrival_time'] = pd.to_timedelta(df_times['arrival_time']).dt.total_seconds()
        df_times['departure_time'] = pd.to_timedelta(df_times['departure_time']).dt.total_seconds()

        # Round the distances
        df_times = df_times.round({'shape_dist': 0, 'hop_dist': 0})

        # Extract line_id, and direction int.
        df_times['line_id'] = df_times['trip_id'].str.split('-').str[1]
        inbound = df_times['trip_id'].str.split('.').str[-1] == 'I'
        outbound = df_times['trip_id'].str.split('.').str[-1] == 'O'
        df_times.loc[inbound, 'direction'] = 1
        df_times.loc[outbound, 'direction'] = 0
        # df_times['route_var'] = df_times['trip_id'].str.split('.').str[-2]

        # Reduce stop_id to match database;
        df_times['stop_id'] = df_times['stop_id'].str.split('_').str[0]  # Deal with mangled _merged_ stop ids.
        # Final six numbers, strip any leading Ds Bs Rs and zeros.
        df_times['stop_id'] = df_times['stop_id'].str.slice(-6).str.lstrip('DBR0')
        # Some stops_ids are generated; zero them.
        condition = df_times['stop_id'].str.contains(':', regex=False)
        df_times.loc[condition, 'stop_id'] = 0

        # Types
        df_times['date'] = pd.to_datetime(df_times['date'])
        df_times = df_times.astype({'arrival_time': 'int64', 'departure_time': 'int64', 'direction': 'int64',
                                    'line_id': 'string', 'stop_id': 'int64', 'stop_sequence': 'int64'})
        df = df.astype({'arrival_time': 'int64', 'departure_time': 'int64', 'direction': 'int64',
                        'line_id': 'string', 'stop_id': 'int64', 'stop_sequence': 'int64'})

        df_times.drop(columns='departure_time', inplace=True)  # We don't join on this; best leave it out.

        # ===MERGE ONE===
        # Split the job to bring peak memory usage down
        frames = np.array_split(df, 20)
        outframes = []
        for df in frames:
            # Merge to match individual rows in the two dataframes, including arrival times
            df = df_times.merge(
                df, on=['date', 'line_id', 'direction', 'stop_sequence', 'stop_id', 'arrival_time'],
                indicator=True, how='right').drop_duplicates(subset=['line_id', 'direction', 'stop_sequence',
                                                                     'stop_id', 'arrival_time', 'db_id'])
            outframes.append(df)
        # Recombine the merged dataframe.
        df = pd.concat(outframes)
        outframes = []
        # print('FIRST:', df.shape[0], flush=True)

        # Separate the matched rows.
        done = df.loc[df['_merge'] == 'both'].drop(columns=['_merge'])
        # print('DONE:', done.shape[0], flush=True)
        # print(done, flush=True)

        # Separate the unmatched rows and prepare the dataframe for round 2.
        df = df.loc[df['_merge'] == 'right_only'].drop(columns=['_merge', 'shape_dist', 'hop_dist', 'trip_id'])
        df.rename(columns={'arrival_time_y': 'arrival_time'}, inplace=True)
        # print('OTHER:', df_other.shape[0], flush=True)
        # print(df_other, flush=True)

        # ===MERGE TWO===
        # Split the job to bring peak memory usage down
        frames = np.array_split(df, 20)
        for df in frames:
            # Merge to match rows in the two dataframes, excluding arrival times
            df = df_times.merge(
                df, on=['date', 'line_id', 'direction', 'stop_sequence', 'stop_id'],
                indicator=True, how='right').drop_duplicates(subset=['line_id', 'direction', 'stop_sequence',
                                                                     'stop_id', 'arrival_time_y', 'db_id'])
            outframes.append(df)

        # Recombine the merged dataframe.
        df = pd.concat(outframes)
        outframes = []

        df.drop(columns=['arrival_time_x'], inplace=True)
        df.rename(columns={'arrival_time_y': 'arrival_time'}, inplace=True)
        # print('SECOND:', df_2.shape[0], flush=True)

        # Separate the matched rows.
        done = pd.concat([done, df.loc[df['_merge'] == 'both'].drop(columns='_merge')])
        # print('DONE 2:', done_2.shape[0], flush=True)
        # print(done_2, flush=True)

        # Separate the unmatched rows and prepare the dataframe for round 3.
        df = df.loc[df['_merge'] == 'right_only'].drop(columns=['_merge', 'shape_dist', 'hop_dist', 'trip_id'])
        # print('OTHER 2:', other_2.shape[0], flush=True)
        # print(other_2, flush=True)

        # ===MERGE THREE===
        # Split the job to bring peak memory usage down
        frames = np.array_split(df, 20)
        for df in frames:
            # Merge to match rows in the two dataframes, excluding stop_sequence
            df = df_times.merge(
                df, on=['date', 'line_id', 'direction', 'stop_id', 'arrival_time'],
                indicator=True, how='right').drop_duplicates(subset=['line_id', 'direction', 'stop_sequence_y',
                                                                     'stop_id', 'arrival_time', 'db_id'])
            outframes.append(df)

        del df_times

        # Recombine the merged dataframe.
        df = pd.concat(outframes)
        outframes = []

        df.drop(columns=['stop_sequence_x'], inplace=True)
        df.rename(columns={'stop_sequence_y': 'stop_sequence', 'departure_time_y': 'departure_time'}, inplace=True)
        # print('THIRD:', df_3.shape[0], flush=True)

        # Separate the matched rows.
        done = pd.concat([done, df[df['_merge'] == 'both'].drop(columns='_merge')])
        # print('DONE 3', done_3.shape[0])
        # print(done_3, flush=True)

        # Separate the unmatched rows.
        df = df.loc[df['_merge'] == 'right_only']

        # Get unmatched rows where stop sequence is one.
        ones = df.loc[df['stop_sequence'] == 1].drop(columns=['_merge'])
        # Get the unmatched rows without those rows.
        df = pd.concat([df, ones]).drop(columns=['_merge', 'shape_dist', 'hop_dist', 'trip_id'])
        df.drop_duplicates(keep=False, inplace=True)
        # Set the dist values for those rows to zero.
        ones['hop_dist'] = 0
        ones['shape_dist'] = 0

        # print('ONES', ones.shape[0])
        # print(ones, flush=True)

        # Concatenate the final dataframe from the matched rows
        done = pd.concat([done, ones])
        del ones

        print('OTHER:', df.shape[0], flush=True)
        # print(other_4, flush=True)

        # Output the unmatched rows for further analysis.
        df.to_csv(f'./other/{current}')

        print('ALL', done.shape[0], flush=True)
        print('TOTAL', done.shape[0] + df.shape[0], done.shape[0] + df.shape[0] == original)
        del df

        # Zero the hop_time and prev_stop of all matched rows, in preparation.
        done['hop_time'] = 0
        done['prev_stop'] = 0

        # Iterate through the trips
        trips = done.groupby(by='db_id')
        for i, done in trips:
            # Calculate the hop times and previous stops.
            done.sort_values(by='stop_sequence', inplace=True)
            done['hop_time'] = done['actual_arrival_time'] - done['actual_dep_time'].shift(1)
            done['prev_stop'] = done['stop_id'].shift(1)
            outframes.append(done)

        # Concatenate the final dataframe.
        done = pd.concat(outframes)
        del outframes
        # Reorder and select
        done = done[['db_id', 'trip_id', 'date', 'line_id', 'direction', 'stop_sequence',
                     'stop_id', 'arrival_time', 'departure_time', 'actual_arrival_time', 'actual_dep_time',
                     'dwell_time', 'shape_dist', 'hop_dist', 'hop_time', 'prev_stop']]
        print(done, flush=True)
        send_to_database(done)

        print(dt.now(), 'DAYEND', current, flush=True)
        print(flush=True)
        current += timedelta(days=1)  # Next day

    print('FINISHED', flush=True)
    return True


def send_to_database(df):
    # Append to MySQL table
    df.to_sql(name='master',
               con=conn,
               index=False,
               if_exists='append',
               chunksize=5000,
               dtype={'db_id': sqlalchemy.types.INTEGER(),
                      'trip_id': sqlalchemy.types.VARCHAR(length=40),
                      'date': sqlalchemy.Date(),
                      'line_id': sqlalchemy.types.VARCHAR(length=5),
                      'direction': sqlalchemy.types.SmallInteger(),
                      'stop_sequence': sqlalchemy.types.INTEGER(),
                      'stop_id': sqlalchemy.types.INTEGER(),
                      'arrival_time': sqlalchemy.types.INTEGER(),
                      'departure_time': sqlalchemy.types.INTEGER(),
                      'actual_arrival_time': sqlalchemy.types.INTEGER(),
                      'actual_dep_time': sqlalchemy.types.INTEGER(),
                      'dwell_time': sqlalchemy.types.INTEGER(),
                      'shape_dist': sqlalchemy.types.INTEGER(),
                      'hop_dist': sqlalchemy.types.INTEGER(),
                      'hop_time': sqlalchemy.types.INTEGER(),
                      'prev_stop': sqlalchemy.types.INTEGER()})


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
    finished = False
    while not finished:
        email_exception(f'Starting: {current}')
        try:
            finished = main()
        except:
            email_exception(traceback.format_exc())

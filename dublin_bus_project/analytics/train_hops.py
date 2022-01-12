import math
import matplotlib.pyplot as plt
import numpy as np
from numpy.random import seed
seed(1)
import pandas as pd
import tensorflow as tf
tf.random.set_seed(1)
from tensorflow.python.keras.layers import Dense
from tensorflow.python.keras.models import Sequential
from tensorflow.keras.layers import Dropout
from sklearn.metrics import mean_absolute_error
from sklearn.metrics import mean_squared_error
import joblib
from tensorflow.keras.models import load_model
import random
import smtplib
import ssl
from email.message import EmailMessage
import traceback

EMAIL = "ec2scrape@gmail.com"
SEND_TO = "ec2scrape@gmail.com"
EMAIL_PASS = 'RObRamW$UcH3_rOmoc3?'


def gen_train(batch_size):
    scaler_x_train = joblib.load('./train/scaler_x_train')
    scaler_y_train = joblib.load('./train/scaler_y_train')
    while True:
        for month in random.sample(range(1, 11), k=10):
            df = pd.read_csv(f'./months/ordinal/{month}.csv.gz')
            df = df.sample(frac=1)
            y = pd.DataFrame(df.pop('hop_time'))
            for i in range(0, df.shape[0], batch_size):
                xtrain = scaler_x_train.transform(df.iloc[i:i+batch_size])
                ytrain = scaler_y_train.transform(y.iloc[i:i+batch_size])
                yield xtrain, ytrain


def gen_val(batch_size):
    scaler_x_val = joblib.load('./train/scaler_x_val')
    scaler_y_val = joblib.load('./train/scaler_y_val')
    while True:
        month = 11
        df = pd.read_csv(f'./months/ordinal/{month}.csv.gz')
        df = df.sample(frac=1)
        y = pd.DataFrame(df.pop('hop_time'))
        for i in range(0, df.shape[0], batch_size):
            xval = scaler_x_val.transform(df.iloc[i:i+batch_size])
            yval = scaler_y_val.transform(y.iloc[i:i+batch_size])
            yield xval, yval


def train():
    df = pd.read_csv(f'./months/ordinal/1.csv.gz', nrows=5)
    print(df.columns, flush=True)
    input_num = df.shape[1] - 1
    n_train_rows = joblib.load('./train/n_train_rows')
    n_val_rows = joblib.load('./train/n_val_rows')

    batch_size = 400
    train_steps = -(n_train_rows // -batch_size)
    val_steps = -(n_val_rows // -batch_size)
    model = Sequential()
    model.add(Dense(input_num*3, input_dim=input_num, kernel_initializer='normal', activation='elu'))
    model.add(Dropout(0.2))
    model.add(Dense(input_num*3, activation='elu'))
    model.add(Dense(input_num*2, activation='elu'))
    model.add(Dense(input_num, activation='elu'))
    model.add(Dense(1, activation='linear'))
    model.summary()
    model.compile(loss='mse', optimizer='adam', metrics=['mse', 'mae'])

    # model = load_model('checkpoint')

    checkpoint = tf.keras.callbacks.ModelCheckpoint(filepath='./checkpoint', save_weights_only=False,
                                                    monitor='val_mse', mode='min', save_best_only=True)

    history = model.fit(gen_train(batch_size), epochs=15, verbose=1, steps_per_epoch=train_steps,
                        validation_data=gen_val(batch_size), validation_steps=val_steps, callbacks=[checkpoint])

    model.save('hops_model')
    print('Model saved')

    print(history.history.keys())
    plt.plot(history.history['loss'])
    plt.plot(history.history['val_loss'])
    plt.title('model loss')
    plt.ylabel('loss')
    plt.xlabel('epoch')
    plt.legend(['train', 'validation'], loc='upper left')
    plt.savefig('./train/train_plot.png')
    # plt.show()


def test():
    model = load_model('hops_model')
    scaler_x = joblib.load('./train/scaler_x_train')
    scaler_y = joblib.load('./train/scaler_y_train')

    month = 12
    df = pd.read_csv(f'./months/ordinal/{month}.csv.gz')
    y_test = pd.DataFrame(df.pop('hop_time'))
    x_test_scaled = scaler_x.transform(df)

    raw_predictions = model.predict(x_test_scaled)

    print('Inverse scaleing')
    predictions = scaler_y.inverse_transform(raw_predictions)
    print('MAE:', mean_absolute_error(y_test, predictions))
    print('RMSE:', math.sqrt(mean_squared_error(y_test, predictions)))
    print('ACTUAL MEAN:', y_test.hop_time.mean())
    print('PREDICTED MEAN', np.mean(predictions))


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
        train()
        test()
    except:
        email_exception(traceback.format_exc())
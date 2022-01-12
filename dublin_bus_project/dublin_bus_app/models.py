from django.db import models

# Create your models here.


class Today(models.Model):
    stop_id = models.CharField(max_length=15)
    trip_id = models.CharField(max_length=40)
    arrival_time = models.DateTimeField()
    departure_time = models.DateTimeField()
    shape_dist = models.FloatField()


class Times(models.Model):
    stop_id = models.CharField(max_length=15)
    trip_id = models.CharField(max_length=40)
    arrival_time = models.DateTimeField()
    departure_time = models.DateTimeField()
    shape_dist = models.FloatField()


class Current(models.Model):
    future_dt = models.DateTimeField()
    temp = models.FloatField()
    feels_like = models.FloatField()
    pressure = models.FloatField()
    humidity = models.IntegerField()
    wind_speed = models.FloatField()
    wind_deg = models.IntegerField()
    clouds = models.IntegerField()
    weather_main = models.CharField(max_length=15)
    weather_desc = models.CharField(max_length=40)
    rain_bool = models.SmallIntegerField()
    icon = models.CharField(max_length=5)


class Hourly(models.Model):
    dt = models.DateTimeField()
    future_dt = models.DateTimeField()
    temp = models.FloatField()
    feels_like = models.FloatField()
    pressure = models.FloatField()
    humidity = models.IntegerField()
    wind_speed = models.FloatField()
    wind_deg = models.IntegerField()
    clouds = models.IntegerField()
    weather_main = models.CharField(max_length=15)
    weather_desc = models.CharField(max_length=40)
    rain_bool = models.SmallIntegerField()


class Daily(models.Model):
    dt = models.DateTimeField()
    future_dt = models.DateField()
    temp = models.FloatField()
    feels_like = models.FloatField()
    pressure = models.FloatField()
    humidity = models.IntegerField()
    wind_speed = models.FloatField()
    wind_deg = models.IntegerField()
    clouds = models.IntegerField()
    weather_main = models.CharField(max_length=15)
    weather_desc = models.CharField(max_length=40)
    rain_bool = models.SmallIntegerField()










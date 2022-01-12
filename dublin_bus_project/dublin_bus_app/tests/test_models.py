from django.test import TestCase
from ..models import *



class TestModels(TestCase):

    def setUp(self):
        self.today1 = Today.objects.create(
            stop_id = "420",
            trip_id="yup",
            arrival_time="Never"
        )
        self.time1=Times.objects.create(
            stop_id="yeet",
            trip_id="Kilkenny",
            arrival_time="1916"
        )
        self.current1=Current.create(
            future_dt = None,
            temp = 19.16,
            feels_like = 20.21,
            pressure = 42.0,
            humidity = 9,
            wind_speed = 88.88,
            wind_deg = 7,
            clouds = 9,
            weather_main = "Looking well",
            weather_desc = "Ah shur its a grand aul day",
            rain_bool = 0,
            icon = "xbfss",
        )
        self.hour1=Hourly.create(
            future_dt = None,
            temp = 34.16,
            feels_like = 34.21,
            pressure = 77.0,
            humidity = 9,
            wind_speed = 88.88,
            wind_deg = 7,
            clouds = 9,
            weather_main = "Tis terrible",
            weather_desc = "sure ya know yerself",
            rain_bool = 1,
            icon = "xbfss",
        )
        self.day1=Daily.create(
            future_dt = None,
            temp = 19.16,
            feels_like = 20.21,
            pressure = 42.0,
            humidity = 9,
            wind_speed = 88.88,
            wind_deg = 7,
            clouds = 9,
            weather_main = "Looking well",
            weather_desc = "Ah shur its a grand aul day",
            rain_bool = 0,
            icon = "xbfss",
        )

    def test_today_insert(self):
        self.assertEqual(self.today1.stop_id,"420")
        self.assertEqual(self.today1.trip_id,"yup")
        self.assertEqual(self.today1.arrival_time,"Never")
    
    def test_times_insert(self):
        self.assertEqual(self.time1.stop_id,"yeet")
        self.assertEqual(self.time1.trip_id,"Kilkenny")
        self.assertEqual(self.time1.arrival_time,"1916")
    
    def test_current_insert(self):
        self.assertEqual(self.hour1.future_dt,None)
        self.assertEqual(self.hour1.temp,19.16)
        self.assertEqual(self.hour1.feels_like,20.21)
        self.assertEqual(self.hour1.pressure,42.0)
        self.assertEqual(self.hour1.humidity,9)
        self.assertEqual(self.hour1.wind_speed,88.88)
        self.assertEqual(self.hour1.wind_deg,7)
        self.assertEqual(self.hour1.clouds,9)
        self.assertEqual(self.hour1.weather_main,"Looking well")
        self.assertEqual(self.hour1.weather_desc,"Ah shur its a grand aul day")
        self.assertEqual(self.hour1.rain_bool,0)
        self.assertEqual(self.hour1.icon,"xbfss")
    
    def test_hourly_insert(self):
        self.assertEqual(self.current1.future_dt,None)
        self.assertEqual(self.current1.temp,34.16)
        self.assertEqual(self.current1.feels_like,34.21)
        self.assertEqual(self.current1.pressure,77.0)
        self.assertEqual(self.current1.humidity,9)
        self.assertEqual(self.current1.wind_speed,88.88)
        self.assertEqual(self.current1.wind_deg,7)
        self.assertEqual(self.current1.clouds,9)
        self.assertEqual(self.current1.weather_main,"Tis terrible")
        self.assertEqual(self.current1.weather_desc,"sure ya know yerself")
        self.assertEqual(self.current1.rain_bool,1)
        self.assertEqual(self.current1.icon,"xbfss")
    
    def test_daily_insert(self):
        self.assertEqual(self.day1.future_dt,None)
        self.assertEqual(self.day1.temp,19.16)
        self.assertEqual(self.day1.feels_like,20.21)
        self.assertEqual(self.day1.pressure,42.0)
        self.assertEqual(self.day1.humidity,9)
        self.assertEqual(self.day1.wind_speed,88.88)
        self.assertEqual(self.day1.wind_deg,7)
        self.assertEqual(self.day1.clouds,9)
        self.assertEqual(self.day1.weather_main,"Looking well")
        self.assertEqual(self.day1.weather_desc,"Ah shur its a grand aul day")
        self.assertEqual(self.day1.rain_bool,0)
        self.assertEqual(self.day1.icon,"xbfss")


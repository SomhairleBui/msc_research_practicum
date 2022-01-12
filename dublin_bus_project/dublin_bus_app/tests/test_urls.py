from django import urls
from django.shortcuts import resolve_url
from django.test import TestCase
from django.test.testcases import SimpleTestCase
from django.urls import reverse,resolve
from ..urls import *
from ..views import *
from ..utils import *
# Create your tests here.



# Tests that the urls are being directed to the correct function
class TestUrls(SimpleTestCase):
    def test_routes_url_is_resolved(self):
        url = reverse("routes")
        self.assertEquals(resolve(url).func,views.routes)

    def test_route_list_url_is_resolved(self):
        url = reverse("route_list")
        self.assertEquals(resolve(url).func,views.route_list)
    
    def test_real_time_url_is_resolved(self):
        url = reverse("real_time")
        self.assertEquals(resolve(url).func,views.real_time)
    
    
    def test_stops_url_is_resolved(self):
        url = reverse("bus_stops")
        self.assertEquals(resolve(url).func,views.stops)

    def test_predict_url_is_resolved(self):
        url = reverse("predictgetter")
        self.assertEquals(resolve(url).func,utils.get_predict_info)

    
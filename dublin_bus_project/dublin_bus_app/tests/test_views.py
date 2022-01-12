from django import urls
from django.shortcuts import resolve_url
from django.test import TestCase,Client
from django.test.testcases import SimpleTestCase
from django.urls import reverse,resolve
from ..urls import *
from ..views import *
from ..utils import *
# Create your tests here.


class TestViews(TestCase):

    def setUP(self):
        self.client = Client()

    def test_routes_return(self):
        response = self.client.get('/routes')
        self.assertEqual(response.status_code,200)
        self.assertIsInstance(response,JsonResponse)
        self.assertContains(response,"7.I")

    def test_route_list_return(self):
        response = self.client.post('/route_list')
        self.assertEqual(response.status_code,200)
        self.assertIsInstance(response,JsonResponse)
        self.assertContains(response,"H3 Outbound,60-H3-d12-1,352,0")
    
    def test_timetable_return_key_error(self):
        response = self.client.get('/timetable/yeet')
        self.assertEqual(response.status_code,200)
        self.assertIsInstance(response,JsonResponse)
        self.assertJSONEqual(response.content,"[]")


    




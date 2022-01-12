from django import urls
from django.shortcuts import resolve_url
from django.test import TestCase,Client
from django.test.testcases import SimpleTestCase
from django.urls import reverse,resolve
from ..urls import *
from ..views import *
from ..utils import *
# Create your tests here.

from sshtunnel import SSHTunnelForwarder
import mysql.connector
from ..dbinfo import *
from datetime import datetime as dt


class test_HPS_connection(TestCase):

    def test_hps_connection(self):
        server = SSHTunnelForwarder(
                        (ssh_host, 22),
                        ssh_username=ssh_user,
                        ssh_password=ssh_password,
                        remote_bind_address=('127.0.0.1', 3306))

        server.start()
        self.assertTrue(server.local_bind_port)
        server.stop()
    
    def test_mysql_connection(self):
        server = SSHTunnelForwarder(
                        (ssh_host, 22),
                        ssh_username=ssh_user,
                        ssh_password=ssh_password,
                        remote_bind_address=('127.0.0.1', 3306))

        server.start()

            # Connect to the Database (via the SSH)
            # info is in the DBINFO file
        cnx = mysql.connector.connect(user=ssh_user,
                                        password=sql_password,
                                        host=sql_hostname,
                                        database=ssh_user,
                                        charset='utf8',
                                        use_unicode='FALSE',
                                        port=server.local_bind_port)

        self.assertTrue(cnx.is_connected())
        server.stop()
        cnx.close()

    def test_weather_getter(self):
        response = weather_getter(dt(2021,7,16,11,30,45))
        self.assertIsInstance(response,dict)

    def test_stop_and_hop(self):
        response = stops_and_hops("102-6 Inbound,2-102-6-gad-1,362,1","8240DB000693","8240DB000943")
        self.assertIsInstance(response,dict)
        self.assertEquals(response["chain_of_hops"],[('8240DB000693','8240DB000942'),('8240DB000942','8240DB000943')])


    
    

from django.test import TestCase,Client
from django.core import management
from ..management.commands import *
from io import StringIO


class CommandsTest(TestCase):
    def test_routes(self):
        out = StringIO()
        management.call_command('routes',stdout=out)

        # These commands dont return a value/object
        # So it the output is empty, that means to error code/message was returned
        self.assertEqual(out.getvalue(),"")
    
    def test_today(self):
        out= StringIO()
        management.call_command('today',stdout=out)

        self.assertEqual(out.getvalue(),"")


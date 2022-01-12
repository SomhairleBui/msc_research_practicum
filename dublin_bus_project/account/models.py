from django.contrib.auth.models import User
from django.db import models


class FavoriteLocation(models.Model):
    # used to store favorite locations
    user = models.ForeignKey(User, db_column="user", on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    url = models.CharField(max_length=255)
    longitude = models.FloatField()
    latitude = models.FloatField()
    telephone = models.CharField(max_length=20)
    address = models.CharField(max_length=100)
    image = models.CharField(max_length=255)
    description = models.CharField(max_length=255, default='')


class FavoriteStop(models.Model):
    # store favorite stops
    user = models.ForeignKey(User, db_column="user", on_delete=models.CASCADE)
    stop_id = models.CharField(max_length=100)
    name = models.CharField(max_length=200, default='')
    stop_name = models.CharField(max_length=200, default='')#


class FavoriteRoute(models.Model):
    # store favorite route
    user = models.ForeignKey(User, db_column="user", on_delete=models.CASCADE)
    route_id = models.CharField(max_length=100)
    name = models.CharField(max_length=200, default='')
    route_name = models.CharField(max_length=200, default='')

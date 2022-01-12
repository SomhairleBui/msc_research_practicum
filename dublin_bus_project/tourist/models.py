from django.db import models


class TouristInfoTag(models.Model):
    # tags
    name = models.CharField(max_length=100, unique=True)


class TouristInfoGroup(models.Model):
    # group name (activities, attractions or accommodations)
    name = models.CharField(max_length=100, unique=True)
    tags = models.ManyToManyField(to=TouristInfoTag)


class TouristInfoPlaces(models.Model):
    # the locations
    info_type = models.CharField(max_length=200)
    name = models.CharField(max_length=100)
    url = models.CharField(max_length=255)
    longitude = models.FloatField()
    latitude = models.FloatField()
    telephone = models.CharField(max_length=20)
    address = models.CharField(max_length=100)
    image = models.CharField(max_length=255)
    tags = models.ManyToManyField(to=TouristInfoTag)
    group_name = models.CharField(max_length=20) # activities, attractions or accommodations

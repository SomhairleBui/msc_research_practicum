import json
import math
import mimetypes
import pickle
from collections import OrderedDict

import requests
from bs4 import BeautifulSoup
from django.core import serializers
from django.http import JsonResponse

from .models import TouristInfoPlaces, TouristInfoGroup
from dublin_bus_app.dbinfo import google_key


def get_tags(group_name='activities'):
    # get tags by group name
    try:
        data = TouristInfoGroup.objects.filter(name=group_name).first()
        result = data.tags.all().values()
        return list(result)
    except:
        return []


def get_locations(group_name='activities', tags=()):
    # get locations by group name and tags
    if not tags or tags == ['']:
        return []
    data = TouristInfoPlaces.objects.filter(group_name=group_name).filter(tags__in=tags).values()
    return list(data)


def activities_tags(request):
    return JsonResponse(get_tags('activities'), safe=False)


def activities_locations(request):
    tag_list = request.GET.get("tags", '').split(',')
    return JsonResponse(get_locations('activities', tag_list), safe=False)


def attractions_tags(request):
    return JsonResponse(get_tags('attractions'), safe=False)


def attractions_locations(request):
    tag_list = request.GET.get("tags", '').split(',')
    return JsonResponse(get_locations('attractions', tag_list), safe=False)


def accommodation_tags(request):
    return JsonResponse(get_tags('accommodation'), safe=False)


def accommodation_locations(request):
    tag_list = request.GET.get("tags", '').split(',')
    return JsonResponse(get_locations('accommodation', tag_list), safe=False)


def get_meta_info(url):
    # get meta description and og:image from url
    description = ''
    image = ''
    try:
        response = requests.get(url, timeout=3)
        soup = BeautifulSoup(response.content, "html.parser")

        tags = soup.findAll("meta")
        for tag in tags:
            if tag.get("property", None) == "og:image":
                image = tag.get("content", '')
                # check if image exists
                mimetype, encoding = mimetypes.guess_type(image)
                if not mimetype or not mimetype.startswith('image'):
                    image = ''
            if tag.get('name', None) == "description":
                description = tag.get("content", '')
                # check if is english site
                if not description.isascii():
                    description = ''
            if image and description:
                break

    except:
        print('cannot extract data from', url)

    return description, image


def get_address(lat, lon):
    # get address from google Geocoding API
    address = ''
    try:
        url = "https://maps.googleapis.com/maps/api/geocode/json?latlng="+str(lat)+","+str(lon)+"&key="+google_key
        response = requests.get(url)
        data = json.loads(response.content)
        address = data['results'][0]['formatted_address']
    except:
        print('cannot get address for lat=', lat, ' lon=', lon)
    return address


def nearby_stops(lat, lon):
    def distance(x2, x1, y2, y1):
        # calculate distance between 2 points
        # https://www.khanacademy.org/math/geometry/hs-geo-analytic-geometry/hs-geo-distance-and-midpoints/v/distance-formula
        return math.sqrt((x2-x1)**2 + (y2-y1)**2)

    stops_dict = pickle.load(open('dublin_bus_app/data/stops.pickle', 'rb'))
    # calculate distance between the stop and location
    dist_result = {}
    for stop_id, stop in stops_dict.items():
        dist_result[stop_id] = distance(lat, stop['stop_lat'], lon, stop['stop_lon'])
    # sort by distance
    sort_dist = list(sorted(dist_result.items(), key=lambda item: item[1]))
    # take closest 10 stops by distance to the given location
    sort_dist = sort_dist[:10]
    result = []
    for key in sort_dist:
        result.append(key[0])

    return result


def location_info(request, id=0):
    try:
        # get location by lat-lon
        longitude = request.GET.get('longitude', '')
        latitude = request.GET.get('latitude', '')
        if id == 0:
            place = TouristInfoPlaces.objects.filter(longitude=longitude, latitude=latitude)[0]
        else:
            # get location info by key
            place = TouristInfoPlaces.objects.filter(id=id)[0]
        # convert model to json
        result = serializers.serialize('json', [place, ])
        data = json.loads(result)[0]['fields']
        # get description and image
        description, image = get_meta_info(place.url)
        data['image'] = image
        data['description'] = description
        # get address from geocode API
        address = get_address(data['latitude'], data['longitude'])
        data['full_address'] = address
        # nearby stops
        data['nearby_stops'] = nearby_stops(data['latitude'], data['longitude'])
        return JsonResponse(data)
    except:
        return JsonResponse({})


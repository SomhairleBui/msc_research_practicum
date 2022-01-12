import json

from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from .models import FavoriteLocation, FavoriteStop, FavoriteRoute
from django.core import serializers


class SignUp(View):

    @csrf_exempt
    def post(self, request):
        # sign up form
        data = json.loads(request.body)
        username = data.get('username', None)
        password = data.get('password', None)
        if not User.objects.filter(username=username).first():
            new_user = User(username=username)
            new_user.set_password(password)
            new_user.save()
            # authenticate new user and log in
            new_user = authenticate(username=username, password=password)
            login(request, new_user)

            return JsonResponse({'username': new_user.username})
        else:
            return JsonResponse({'error': 'user already exists!'}, status=401)


class Login(View):

    @csrf_exempt
    def post(self, request):
        # login form
        data = json.loads(request.body)
        username = data.get('username', None)
        password = data.get('password', None)
        user = authenticate(username=username, password=password)
        if user is not None:
            if user.is_active:
                login(request, user)
                user_data = {
                    'username': user.username,
                    'id': user.id
                }
                return JsonResponse(user_data, status=200)
            return JsonResponse({'error': 'User is not active'}, status=401)
        return JsonResponse({'error': 'Unauthorized'}, status=401)


class Logout(View):

    def get(self, request):
        # logout
        logout(request)
        return JsonResponse({'message': 'Logout successful'})


@method_decorator(login_required, name='dispatch')
class Dashboard(View):

    def get(self, request):
        return JsonResponse({'message': 'Welcome'})


class Favorite(View):

    def get(self, request):
        # get list of favorite locations for the user
        if request.user.is_authenticated:
            print('user authenticated', request.user.username)
            data = FavoriteLocation.objects.filter(user=request.user).all()
            result = serializers.serialize('json', data)
            result = json.loads(result)
            return JsonResponse(result, safe=False)
        return JsonResponse({'data': 'unauthorized access'}, status=401)

    @csrf_exempt
    def post(self, request):
        # save favorite location for the user
        if request.user.is_authenticated:
            data = json.loads(request.body)
            data = data['location']

            # check if already favorite
            fav_count = FavoriteLocation.objects.filter(latitude=data['latitude'],
                                                        longitude=data['longitude'],
                                                        user=request.user).count()

            if fav_count == 0:
                # create and save favorite
                favorite = FavoriteLocation(name=data['name'],
                                            url=data['url'],
                                            longitude=data['longitude'],
                                            latitude=data['latitude'],
                                            telephone=data['telephone'],
                                            address=data['full_address'],
                                            description=data['description'],
                                            image=data['image'],
                                            user=request.user)
                favorite.save()

            return JsonResponse({'message': 'got it'})
        else:
            return JsonResponse({'message': 'unauthorized'}, status=401)

    @csrf_exempt
    def delete(self, request, pk):
        # remove favorite location from user
        if request.user.is_authenticated:
            favorite = FavoriteLocation.objects.get(pk=pk, user=request.user)
            favorite.delete()
            return JsonResponse({'message': 'location removed'})
        else:
            return JsonResponse({'message': 'unauthorized'}, status=401)


@csrf_exempt
def delete_by_lat_lon(request, latitude, longitude):
    # remove favorite location from user by latitude and longitude
    if request.user.is_authenticated:
        favorite = FavoriteLocation.objects.get(user=request.user, latitude=float(latitude), longitude=float(longitude))
        favorite.delete()
        return JsonResponse({'message': 'location removed'})
    else:
        return JsonResponse({'message': 'unauthorized'}, status=401)


class FavoriteStops(View):

    def get(self, request):
        # get favorite stops
        if request.user.is_authenticated:
            data = FavoriteStop.objects.filter(user=request.user).values('stop_id', 'name', 'stop_name').all()
            result = list(data)
            print(result)
            return JsonResponse([{'stop_id': item['stop_id'], 'name': item['name'], 'stop_name': item['stop_name']} for item in result], safe=False)
        return JsonResponse({'data': 'unauthorized access'}, status=401)

    @csrf_exempt
    def post(self, request, stop_id):
        # save favorite stop
        if request.user.is_authenticated:
            data = json.loads(request.body)
            name = data['name']
            stop_name = data['stop_name']
            favorite = FavoriteStop(stop_id=stop_id, user=request.user, name=name, stop_name=stop_name)
            favorite.save()
            return JsonResponse({'message': 'bus stop saved'})
        else:
            return JsonResponse({'message': 'unauthorized'}, status=401)

    @csrf_exempt
    def delete(self, request, stop_id):
        # remove favorite location from user
        if request.user.is_authenticated:
            favorite = FavoriteStop.objects.get(stop_id=stop_id, user=request.user)
            favorite.delete()
            return JsonResponse({'message': 'stop removed'})
        else:
            return JsonResponse({'message': 'unauthorized'}, status=401)


class FavoriteRoutes(View):

    def get(self, request):
        # get favorite stops
        if request.user.is_authenticated:
            data = FavoriteRoute.objects.filter(user=request.user).values('route_id', 'name', 'route_name').all()
            result = list(data)
            print(result)
            return JsonResponse([{'route_id': item['route_id'], 'name': item['name'], 'route_name': item['route_name']} for item in result], safe=False)
        return JsonResponse({'data': 'unauthorized access'}, status=401)

    @csrf_exempt
    def post(self, request):
        # save favorite stop change
        if request.user.is_authenticated:
            data = json.loads(request.body)
            # delete or update selected route
            if 'action' in data and data['action'] == 'delete':
                route_id = data['route_id']
                favorite = FavoriteRoute.objects.get(route_id=route_id, user=request.user)
                favorite.delete()
            else:
                # get data from request
                name = data['name']
                route_name = data['route_name']
                route_id = data['route_id']
                favorite = FavoriteRoute(route_id=route_id, user=request.user, name=name, route_name=route_name)
                favorite.save()
            return JsonResponse({'message': 'bus route  updated'})
        else:
            return JsonResponse({'message': 'unauthorized'}, status=401)


class Account(View):

    @csrf_exempt
    def delete(self, request):
        # remove favorite location from user
        if request.user.is_authenticated:
            print('removing user', request.user.username)
            request.user.delete()

        return JsonResponse({'message': 'user removed'})
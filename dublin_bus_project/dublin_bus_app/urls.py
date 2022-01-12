from django.urls import path
from . import views
from . import utils

urlpatterns = [
    #Url Path, the view.py function and name
    path('', views.index, name="index"),
    path("weather", views.weather, name="weather"),
    path("route_list", views.route_list, name="route_list"),
    path("real_time", views.real_time, name="real_time"),
    path("timetable/<str:stop_id>", views.timetable, name="timetable"),
    path("stops", views.stops, name="bus_stops"),
    path("locations", views.locations, name="bus_stop_locations"),
    path("shapes", views.shapes, name="route_shapes"),
    path("predict", utils.get_predict_info, name="predictgetter"),
    path("predict2", utils.get_predict_info2, name="predictgetter2")
]
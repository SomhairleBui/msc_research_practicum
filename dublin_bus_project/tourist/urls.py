from django.urls import path, include

from . import views

urlpatterns = [
    # get tourist info
    path('activities/tags', views.activities_tags),
    path('activities/locations', views.activities_locations),
    path('attractions/tags', views.attractions_tags),
    path('attractions/locations', views.attractions_locations),
    path('accommodation/tags', views.accommodation_tags),
    path('accommodation/locations', views.accommodation_locations),
    path('location/<int:id>', views.location_info)
]
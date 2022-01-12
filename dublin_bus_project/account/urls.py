from django.urls import path
from .views import Login, SignUp, Logout, Dashboard, Favorite, delete_by_lat_lon, FavoriteStops, Account, FavoriteRoutes

urlpatterns = [
    path('login/', Login.as_view()),
    path('logout/', Logout.as_view()),
    path('remove/', Account.as_view()),
    path('signup/', SignUp.as_view()),
    path('dashboard/', Dashboard.as_view()),
    path('favorite/', Favorite.as_view()),
    path('favorite/<int:pk>', Favorite.as_view()),  # remove favorite from list
    path('favorite/remove/<str:latitude>/<str:longitude>', delete_by_lat_lon),
    path('favorite/stop/<str:stop_id>', FavoriteStops.as_view()),  # store favorite stop
    path('favorite/stops', FavoriteStops.as_view()),  # list all favorite stops
    path('favorite/route', FavoriteRoutes.as_view()),  # store favorite stop
    path('favorite/routes', FavoriteRoutes.as_view()),  # list all favorite stops
]

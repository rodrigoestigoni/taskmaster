from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('app.tasks.urls')),
    path('api/auth/', include('dj_rest_auth.urls')),  # URLs para autenticação
    path('api/auth/register/', include('dj_rest_auth.registration.urls')),  # URLs para registro
]

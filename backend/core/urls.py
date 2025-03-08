from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from app.accounts.views import EmailTokenObtainPairView, RegisterView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('app.tasks.urls')),
    # Autenticação personalizada
    path('api/auth/token/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/register/', RegisterView.as_view(), name='register'),
]
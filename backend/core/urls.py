from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from dj_rest_auth.views import LoginView
from app.accounts.serializers import CustomLoginSerializer
from app.accounts.views import CustomLoginTestView
from app.accounts.views import AuthDebugView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('app.tasks.urls')),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/register/', include('dj_rest_auth.registration.urls')),

    path('api/auth/test-login/', CustomLoginTestView.as_view(), name='test_login'),
    path('api/auth/debug/', AuthDebugView.as_view(), name='auth_debug'),
    
    # Especifique explicitamente o serializer de login
    path('api/auth/login/', LoginView.as_view(serializer_class=CustomLoginSerializer), name='rest_login'),
    
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
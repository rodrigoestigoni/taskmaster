from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, CategoryViewSet, GoalViewSet, EnergyProfileViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'goals', GoalViewSet, basename='goal')
router.register(r'energy-profile', EnergyProfileViewSet, basename='energy-profile')

urlpatterns = [
    path('', include(router.urls)),
]
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'services', views.ServiceViewSet, basename='service')
router.register(r'specializations', views.SpecializationViewSet, basename='specialization')

urlpatterns = [
    path('', include(router.urls)),
]
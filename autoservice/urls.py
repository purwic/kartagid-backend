from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'services', views.ServiceViewSet, basename='service')
router.register(r'specializations', views.SpecializationViewSet, basename='specialization')
router.register(r'services-admin', views.ServiceCreateUpdateViewSet, basename='service-admin')
router.register(r'reviews', views.ReviewViewSet, basename='review')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', views.api_login, name='api_login'),
    path('auth/logout/', views.api_logout, name='api_logout'),
    path('auth/check/', views.api_check_auth, name='api_check_auth'),
]
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from autoservice.views import service_manager_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('autoservice.urls')),
    path('manage/', service_manager_view, name='service_manager'),
    path('', TemplateView.as_view(template_name='index.html')),
]
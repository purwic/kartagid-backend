from rest_framework import viewsets
from rest_framework.response import Response
from .models import Service, Specialization
from .serializers import ServiceSerializer


class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint для получения списка сервисов"""
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Поиск по названию или адресу
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(name__icontains=search) | \
                       queryset.filter(address__icontains=search)

        return queryset


class SpecializationViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint для списка специализаций"""
    queryset = Specialization.objects.all()

    def list(self, request):
        specs = Specialization.objects.values_list('name', flat=True)
        return Response(list(specs))
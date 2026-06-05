from rest_framework import viewsets, serializers, permissions
from rest_framework.response import Response
from .models import Service, Specialization, Review
from .serializers import ServiceSerializer, ReviewSerializer
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render

@staff_member_required
def service_manager_view(request):
    """Страница управления сервисами (только для админов)"""
    return render(request, 'service_manager.html')

class ServiceCreateUpdateViewSet(viewsets.ModelViewSet):
    """API для создания, обновления и удаления сервисов (только для админов)"""
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ServiceCreateSerializer
        return ServiceSerializer


class ServiceCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания/обновления сервиса"""

    class Meta:
        model = Service
        fields = ['id', 'name', 'address', 'phone', 'hours',
                  'avg_check', 'rating', 'latitude', 'longitude']

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


@csrf_protect
@require_POST
def api_login(request):
    """API endpoint для входа"""
    import json
    data = json.loads(request.body)
    username = data.get('username')
    password = data.get('password')

    user = authenticate(request, username=username, password=password)

    if user is not None:
        login(request, user)
        return JsonResponse({
            'success': True,
            'user': {
                'username': user.username,
                'is_staff': user.is_staff
            }
        })
    else:
        return JsonResponse({
            'success': False,
            'error': 'Неверный логин или пароль'
        }, status=401)

def api_logout(request):
    """API endpoint для выхода"""
    logout(request)
    return JsonResponse({'success': True})

def api_check_auth(request):
    """Проверка статуса авторизации"""
    if request.user.is_authenticated:
        return JsonResponse({
            'authenticated': True,
            'user': {
                'username': request.user.username,
                'is_staff': request.user.is_staff
            }
        })
    else:
        return JsonResponse({'authenticated': False})


class ReviewViewSet(viewsets.ModelViewSet):
    """API для управления отзывами"""
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer

    def get_permissions(self):
        """
        Обычные пользователи могут только создавать отзывы.
        Изменять/удалять могут только админы.
        """
        if self.action in ['create']:
            # Создание отзыва доступно всем
            permission_classes = [permissions.AllowAny]
        else:
            # Изменение/удаление только для админов
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """После создания отзыва пересчитываем рейтинг"""
        review = serializer.save()
        review.service.recalculate_rating()

    def perform_update(self, serializer):
        """После обновления пересчитываем рейтинг"""
        review = serializer.save()
        review.service.recalculate_rating()

    def perform_destroy(self, instance):
        """После удаления пересчитываем рейтинг"""
        service = instance.service
        instance.delete()
        service.recalculate_rating()
from rest_framework import viewsets, serializers, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from .models import Service, Specialization, Review
from .serializers import ServiceSerializer, ReviewSerializer, SpecializationSerializer
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render

@staff_member_required
def service_manager_view(request):
    """страница управления сервисами"""
    return render(request, 'service_manager.html')

class ServiceCreateUpdateViewSet(viewsets.ModelViewSet):
    """api для сервисов"""
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ServiceCreateSerializer
        return ServiceSerializer


class ServiceCreateSerializer(serializers.ModelSerializer):
    """сериализатор для сервиса"""
    specs = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Service
        fields = ['id', 'name', 'address', 'phone', 'hours',
                  'avg_check', 'rating', 'latitude', 'longitude', 'specs']
        extra_kwargs = {
            'phone': {'required': False, 'allow_null': True, 'allow_blank': True},
            'hours': {'required': False, 'allow_null': True, 'allow_blank': True},
            'avg_check': {'required': False, 'allow_null': True},
            'rating': {'required': False, 'allow_null': True}
        }

    def validate_name(self, value):
        """проверка названия сервиса"""
        if not value or not value.strip():
            raise ValidationError("Название не может быть пустым")
        if len(value.strip()) < 3:
            raise ValidationError("Название слишком короткое (минимум 3 символа)")
        if len(value.strip()) > 255:
            raise ValidationError("Название слишком длинное")
        return value.strip()

    def validate_address(self, value):
        """проверка адреса"""
        if not value or not value.strip():
            raise ValidationError("Адрес не может быть пустым")
        if len(value.strip()) < 5:
            raise ValidationError("Адрес слишком короткий")
        return value.strip()

    def validate_phone(self, value):
        """проверка телефона"""
        # может быть null
        if value is None or (isinstance(value, str) and not value.strip()):
            return None

        # убираем все кроме цифр и плюса
        import re
        cleaned = re.sub(r'[^\d+]', '', value)
        if len(cleaned) < 10:
            raise ValidationError("Некорректный номер телефона")
        return value

    def validate_hours(self, value):
        """проверка часов работы"""
        # может быть null
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        return value

    def validate_avg_check(self, value):
        """проверка среднего чека"""
        # может быть null
        if value is None:
            return None

        if value < 0:
            raise ValidationError("Средний чек не может быть отрицательным")
        if value > 1000000:
            raise ValidationError("Средний чек слишком большой")
        return value

    def validate_latitude(self, value):
        """проверка широты"""
        if value is None:
            raise ValidationError("Укажите широту")
        if value < -90 or value > 90:
            raise ValidationError("Широта должна быть от -90 до 90")
        return value

    def validate_longitude(self, value):
        """проверка долготы"""
        if value is None:
            raise ValidationError("Укажите долготу")
        if value < -180 or value > 180:
            raise ValidationError("Долгота должна быть от -180 до 180")
        return value

    def create(self, validated_data):
        specs_data = validated_data.pop('specs', [])
        service = Service.objects.create(**validated_data)

        # привязываем специализации
        for spec_name in specs_data:
            spec, created = Specialization.objects.get_or_create(name=spec_name)
            service.specs.add(spec)

        return service

    def update(self, instance, validated_data):
        specs_data = validated_data.pop('specs', [])

        # обновляем основные поля
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # обновляем специализации
        instance.specs.clear()
        for spec_name in specs_data:
            spec, created = Specialization.objects.get_or_create(name=spec_name)
            instance.specs.add(spec)

        return instance

class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    """api endpoint для получения сервисов"""
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # поиск по названию или адресу
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(name__icontains=search) | \
                       queryset.filter(address__icontains=search)

        return queryset


class SpecializationViewSet(viewsets.ReadOnlyModelViewSet):
    """api endpoint для специализаций"""
    queryset = Specialization.objects.all()

    def list(self, request):
        specs = Specialization.objects.values_list('name', flat=True)
        return Response(list(specs))


class SpecializationAdminViewSet(viewsets.ModelViewSet):
    """api для управления специализациями"""
    queryset = Specialization.objects.all()
    serializer_class = SpecializationSerializer
    permission_classes = [permissions.IsAdminUser]


@csrf_protect
@require_POST
def api_login(request):
    """api endpoint для входа"""
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
    """api endpoint для выхода"""
    logout(request)
    return JsonResponse({'success': True})

def api_check_auth(request):
    """проверка статуса авторизации"""
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
    """api для управления отзывами"""
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
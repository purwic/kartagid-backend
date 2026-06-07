from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import Service, Specialization, Review


class SpecializationModelTest(TestCase):
    """тесты специализаций"""

    def test_create_spec(self):
        """создание специализации"""
        spec = Specialization.objects.create(name="test")
        self.assertEqual(spec.name, "test")

    def test_unique_name(self):
        """проверка уникальности названия"""
        Specialization.objects.create(name="test")
        with self.assertRaises(Exception):
            Specialization.objects.create(name="test")


class ServiceModelTest(TestCase):
    """тесты сервисов"""

    def test_create_service(self):
        """создание сервиса"""
        service = Service.objects.create(
            name="test",
            address="test address",
            latitude=55.7961,
            longitude=49.1088
        )
        self.assertEqual(service.name, "test")

    def test_null_fields(self):
        """проверка null значений"""
        service = Service.objects.create(
            name="test",
            address="test address",
            latitude=55.7961,
            longitude=49.1088,
            phone=None,
            hours=None,
            avg_check=None,
            rating=None
        )
        self.assertIsNone(service.phone)
        self.assertIsNone(service.avg_check)


class ReviewModelTest(TestCase):
    """тесты отзывов"""

    def setUp(self):
        self.service = Service.objects.create(
            name="test",
            address="test address",
            latitude=55.7961,
            longitude=49.1088
        )

    def test_create_review(self):
        """создание отзыва"""
        review = Review.objects.create(
            service=self.service,
            author="test",
            text="test text",
            rating=5
        )
        self.assertEqual(review.rating, 5)


class APITest(TestCase):
    """тесты API"""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin',
            password='admin123',
            is_staff=True
        )
        self.service = Service.objects.create(
            name="test",
            address="test address",
            latitude=55.7961,
            longitude=49.1088
        )

    def test_get_services(self):
        """получение списка сервисов"""
        response = self.client.get('/api/services/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_review_public(self):
        """создание отзыва без авторизации"""
        data = {
            'service': self.service.id,
            'author': 'test',
            'text': 'test',
            'rating': 4
        }
        response = self.client.post('/api/reviews/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_create_service(self):
        """админ создает сервис"""
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': 'test',
            'address': 'test address',
            'latitude': 55.8,
            'longitude': 49.2,
            'phone': None,
            'hours': None,
            'avg_check': None
        }
        response = self.client.post('/api/services-admin/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_cannot_create_service(self):
        """обычный пользователь не может создать сервис"""
        user = User.objects.create_user(username='user', password='user123')
        self.client.force_authenticate(user=user)
        data = {
            'name': 'test',
            'address': 'test address',
            'latitude': 55.8,
            'longitude': 49.2
        }
        response = self.client.post('/api/services-admin/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_validation_empty_name(self):
        """валидация пустого названия"""
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': '',
            'address': 'test address',
            'latitude': 55.8,
            'longitude': 49.2
        }
        response = self.client.post('/api/services-admin/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validation_invalid_coordinates(self):
        """валидация координат"""
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': 'test',
            'address': 'test address',
            'latitude': 999,
            'longitude': 999
        }
        response = self.client.post('/api/services-admin/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validation_rating_range(self):
        """валидация рейтинга отзыва"""
        data = {
            'service': self.service.id,
            'author': 'test',
            'text': 'test text',
            'rating': 6
        }
        response = self.client.post('/api/reviews/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rating_recalculation(self):
        """проверка пересчета рейтинга"""
        data = {
            'service': self.service.id,
            'author': 'test',
            'text': 'test text',
            'rating': 4
        }
        self.client.post('/api/reviews/', data, format='json')
        self.service.refresh_from_db()
        self.assertEqual(self.service.rating, 4.0)
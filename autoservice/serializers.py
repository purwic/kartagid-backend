from rest_framework import serializers
from .models import Service, Review, Specialization


class SpecializationSerializer(serializers.ModelSerializer):
    """сериализатор для специализаций"""

    class Meta:
        model = Specialization
        fields = ['id', 'name']

    def validate_name(self, value):
        """проверка что название не пустое и уникальное"""
        if not value.strip():
            raise serializers.ValidationError("Название не может быть пустым")

        # проверяем уникальность
        if self.instance:
            if Specialization.objects.filter(name=value).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("Такая специализация уже существует")
        else:
            if Specialization.objects.filter(name=value).exists():
                raise serializers.ValidationError("Такая специализация уже существует")

        return value.strip()


class ReviewSerializer(serializers.ModelSerializer):
    """сериализатор отзывов"""

    class Meta:
        model = Review
        fields = ['id', 'service', 'author', 'text', 'rating', 'date']

    def validate_rating(self, value):
        """валидация оценки"""
        if value < 1 or value > 5:
            raise serializers.ValidationError("Оценка должна быть от 1 до 5")
        return value

    def validate_author(self, value):
        """валида2ия имени автора"""
        if not value or not value.strip():
            raise serializers.ValidationError("Укажите имя автора")
        if len(value) < 2:
            raise serializers.ValidationError("Имя слишком короткое")
        return value.strip()

    def validate_text(self, value):
        """проверка длины текста отзыва"""
        if value and len(value) > 1000:
            raise serializers.ValidationError("Текст отзыва слишком длинный (максимум 1000 символов)")
        return value


class ServiceSerializer(serializers.ModelSerializer):
    """сериализатор для просмотра сервисов"""
    reviews = ReviewSerializer(many=True, read_only=True)
    specs = serializers.StringRelatedField(many=True, read_only=True)

    class Meta:
        model = Service
        fields = ['id', 'name', 'address', 'phone', 'hours',
                  'avg_check', 'rating', 'latitude', 'longitude',
                  'reviews', 'specs']
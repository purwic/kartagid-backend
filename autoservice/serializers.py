from rest_framework import serializers
from .models import Service, Review


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id', 'service', 'author', 'text', 'rating', 'date']


class ServiceSerializer(serializers.ModelSerializer):
    reviews = ReviewSerializer(many=True, read_only=True)
    specs = serializers.StringRelatedField(many=True, read_only=True)

    class Meta:
        model = Service
        fields = ['id', 'name', 'address', 'phone', 'hours',
                  'avg_check', 'rating', 'latitude', 'longitude',
                  'reviews', 'specs']
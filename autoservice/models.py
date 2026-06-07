from django.db import models
from django.utils import timezone

class Service(models.Model):
    # модель автосервиса
    name = models.CharField(max_length=100)
    address = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, null=True, blank=True)
    hours = models.CharField(max_length=50, null=True, blank=True)
    avg_check = models.IntegerField(null=True, blank=True)
    rating = models.FloatField(null=True, blank=True)
    specs = models.ManyToManyField(
        "Specialization",
        blank=True,
        related_name="services"
    )

    # ширина и долгота
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)

    # создано и обновлено когда
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    def recalculate_rating(self):
        # средний рейтинг считается автоматически
        from django.db.models import Avg
        avg = self.reviews.aggregate(Avg('rating'))['rating__avg']
        if avg:
            self.rating = round(avg, 1)
            self.save()


class Specialization(models.Model):
    # модель специализации
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Review(models.Model):
    # модель отзыва
    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name="reviews"
    )
    author = models.CharField(max_length=100, blank=True)
    text = models.TextField(blank=True, null=True)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    date = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"Отзыв от {self.author} для {self.service.name}"
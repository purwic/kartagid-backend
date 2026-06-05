from django.db import models


class Service(models.Model):
    """Модель автосервиса"""
    name = models.CharField("Название", max_length=255)
    address = models.CharField("Адрес", max_length=500)
    phone = models.CharField("Телефон", max_length=50, blank=True)
    hours = models.CharField("Часы работы", max_length=255, blank=True)
    avg_check = models.IntegerField("Средний чек", default=0)
    rating = models.FloatField("Рейтинг", default=0.0)

    latitude = models.DecimalField("Широта", max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField("Долгота", max_digits=9, decimal_places=6, null=True, blank=True)

    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "Автосервис"
        verbose_name_plural = "Автосервисы"
        ordering = ["-rating"]

    def __str__(self):
        return self.name


class Specialization(models.Model):
    """Модель специализации (теги)"""
    name = models.CharField("Название", max_length=100, unique=True)

    class Meta:
        verbose_name = "Специализация"
        verbose_name_plural = "Специализации"

    def __str__(self):
        return self.name


class Review(models.Model):
    """Модель отзыва"""
    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="Сервис"
    )
    author = models.CharField("Автор", max_length=100)
    text = models.TextField("Текст отзыва")
    rating = models.IntegerField("Оценка", choices=[(i, i) for i in range(1, 6)])
    date = models.DateField("Дата")

    class Meta:
        verbose_name = "Отзыв"
        verbose_name_plural = "Отзывы"
        ordering = ["-date"]

    def __str__(self):
        return f"Отзыв от {self.author} для {self.service.name}"
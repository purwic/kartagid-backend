from django.contrib import admin
from .models import Service, Specialization, Review


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "address", "rating", "avg_check")
    search_fields = ("name", "address")
    list_filter = ("rating",)


@admin.register(Specialization)
class SpecializationAdmin(admin.ModelAdmin):
    list_display = ("name",)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("author", "service", "rating", "date")
    list_filter = ("rating", "date")
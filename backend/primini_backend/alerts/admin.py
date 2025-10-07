from django.contrib import admin

from .models import Alert


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('user', 'product', 'threshold_price', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('user__email', 'product__name')

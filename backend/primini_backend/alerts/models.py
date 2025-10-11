from django.conf import settings
from django.db import models

from primini_backend.products.models import Product


class Alert(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='alerts', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name='alerts', on_delete=models.CASCADE)
    threshold_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'product')
        ordering = ['-created_at']

    def __str__(self):
        return f"Alerte {self.user} - {self.product}"

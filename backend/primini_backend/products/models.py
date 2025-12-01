from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160, unique=True, blank=True)
    icon = models.URLField(blank=True)
    parent = models.ForeignKey('self', related_name='children', on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        verbose_name = 'Catégorie'
        verbose_name_plural = 'Catégories'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Merchant(models.Model):
    name = models.CharField(max_length=150)
    logo = models.URLField(blank=True)
    website = models.URLField(blank=True)
    description = models.TextField(blank=True)
    pay_status = models.BooleanField(default=False)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
    ]

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=210, unique=True, blank=True)
    description = models.TextField(blank=True)
    specs = models.JSONField(default=dict, blank=True)
    image = models.URLField(blank=True)
    category = models.ForeignKey(Category, related_name='products', on_delete=models.SET_NULL, null=True)
    brand = models.CharField(max_length=120, blank=True)
    release_date = models.DateField(null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)
    source_category = models.CharField(max_length=150, blank=True)
    raw_price_map = models.JSONField(default=dict, blank=True)
    raw_url_map = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Approval workflow fields
    approval_status = models.CharField(
        max_length=20,
        choices=APPROVAL_STATUS_CHOICES,
        default='approved'  # Default to approved for backward compatibility
    )
    created_by = models.ForeignKey(
        'users.User',
        related_name='created_products',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    approved_by = models.ForeignKey(
        'users.User',
        related_name='approved_products',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class PriceOffer(models.Model):
    STOCK_CHOICES = [
        ('in_stock', 'En stock'),
        ('low_stock', 'Stock faible'),
        ('out_of_stock', 'Rupture de stock'),
    ]

    product = models.ForeignKey(Product, related_name='offers', on_delete=models.CASCADE)
    merchant = models.ForeignKey(Merchant, related_name='offers', on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default='MAD')
    raw_price_text = models.CharField(max_length=64, blank=True)
    stock_status = models.CharField(max_length=32, choices=STOCK_CHOICES, default='in_stock')
    url = models.URLField(blank=True)
    date_updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['price']
        unique_together = ('product', 'merchant')

    def __str__(self):
        return f"{self.product} - {self.merchant}"


class Promotion(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    products = models.ManyToManyField(Product, related_name='promotions', blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title


class PopularProduct(models.Model):
    product = models.ForeignKey(Product, related_name='popularity_entries', on_delete=models.CASCADE)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['position']

    def __str__(self):
        return f"{self.position} - {self.product.name}"

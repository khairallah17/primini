from django.db import models
from django.core.exceptions import ValidationError
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
    logo = models.URLField(blank=True, help_text='External logo URL')
    logo_file = models.ImageField(upload_to='merchants/', blank=True, null=True, help_text='Uploaded logo file')
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
    image = models.URLField(blank=True)  # External image URL
    image_file = models.ImageField(upload_to='products/', blank=True, null=True)  # Local image file
    category = models.ForeignKey(Category, related_name='products', on_delete=models.SET_NULL, null=True, blank=True)
    subcategory = models.ForeignKey(
        Category, 
        related_name='subcategory_products', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        limit_choices_to={'parent__isnull': False},  # Only allow subcategories (categories with a parent)
        help_text='Optional subcategory. Must be a child category.'
    )
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

    def clean(self):
        """Validate that subcategory is actually a subcategory (has a parent)."""
        if self.subcategory and not self.subcategory.parent:
            raise ValidationError({
                'subcategory': 'Subcategory must be a child category (must have a parent category).'
            })
        
        # Optional: Validate that subcategory belongs to the same parent category
        if self.category and self.subcategory:
            if self.subcategory.parent != self.category:
                raise ValidationError({
                    'subcategory': f'Subcategory "{self.subcategory.name}" does not belong to category "{self.category.name}".'
                })

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        self.full_clean()  # Run validation
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class PriceOffer(models.Model):
    STOCK_CHOICES = [
        ('in_stock', 'En stock'),
        ('low_stock', 'Stock faible'),
        ('out_of_stock', 'Rupture de stock'),
    ]
    
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
    ]

    product = models.ForeignKey(Product, related_name='offers', on_delete=models.CASCADE)
    merchant = models.ForeignKey(Merchant, related_name='offers', on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default='MAD')
    raw_price_text = models.CharField(max_length=64, blank=True)
    stock_status = models.CharField(max_length=32, choices=STOCK_CHOICES, default='in_stock')
    url = models.URLField(blank=True)
    date_updated = models.DateTimeField(auto_now=True)
    # Approval workflow fields
    approval_status = models.CharField(
        max_length=20,
        choices=APPROVAL_STATUS_CHOICES,
        default='approved'  # Default to approved for backward compatibility
    )
    created_by = models.ForeignKey(
        'users.User',
        related_name='created_offers',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    approved_by = models.ForeignKey(
        'users.User',
        related_name='approved_offers',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    # Allow users to submit merchant name if merchant doesn't exist
    merchant_name = models.CharField(max_length=150, blank=True, help_text='Merchant name if creating new merchant')

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


class ProductImage(models.Model):
    """Model to store multiple images for a product (supports both uploaded files and external URLs)"""
    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='products/', blank=True, null=True, help_text='Uploaded image file')
    image_url = models.URLField(blank=True, help_text='External image URL (alternative to uploaded file)')
    order = models.PositiveIntegerField(default=0, help_text='Order for displaying images')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = 'Image produit'
        verbose_name_plural = 'Images produit'

    def clean(self):
        """Validate that either image or image_url is provided"""
        from django.core.exceptions import ValidationError
        if not self.image and not self.image_url:
            raise ValidationError('Either image file or image URL must be provided.')

    def save(self, *args, **kwargs):
        self.full_clean()  # Run validation
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} - Image {self.order}"


class PopularProduct(models.Model):
    product = models.ForeignKey(Product, related_name='popularity_entries', on_delete=models.CASCADE)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['position']

    def __str__(self):
        return f"{self.position} - {self.product.name}"

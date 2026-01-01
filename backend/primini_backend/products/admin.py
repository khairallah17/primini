from django.contrib import admin

from . import models


@admin.register(models.Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(models.Merchant)
class MerchantAdmin(admin.ModelAdmin):
    list_display = ('name', 'pay_status')
    list_filter = ('pay_status',)


class PriceOfferInline(admin.TabularInline):
    model = models.PriceOffer
    extra = 1


@admin.register(models.Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'subcategory', 'brand', 'approval_status', 'created_by', 'approved_by', 'created_at')
    list_filter = ('category', 'subcategory', 'brand', 'approval_status', 'created_at')
    search_fields = ('name', 'brand', 'created_by__email')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [PriceOfferInline]
    readonly_fields = ('created_at', 'updated_at', 'approved_at', 'created_by', 'approved_by')
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('name', 'slug', 'description', 'image', 'category', 'subcategory', 'brand', 'release_date', 'tags')
        }),
        ('Données techniques', {
            'fields': ('specs', 'source_category', 'raw_price_map', 'raw_url_map')
        }),
        ('Workflow d\'approbation', {
            'fields': ('approval_status', 'created_by', 'approved_by', 'approved_at', 'rejection_reason')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:  # New product
            obj.created_by = request.user
            if request.user.is_admin or request.user.is_superuser:
                obj.approval_status = 'approved'
                obj.approved_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(models.PriceOffer)
class PriceOfferAdmin(admin.ModelAdmin):
    list_display = ('product', 'merchant', 'price', 'stock_status', 'date_updated')
    list_filter = ('merchant', 'stock_status')


@admin.register(models.Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ('title', 'start_date', 'end_date')
    filter_horizontal = ('products',)


@admin.register(models.PopularProduct)
class PopularProductAdmin(admin.ModelAdmin):
    list_display = ('product', 'position')

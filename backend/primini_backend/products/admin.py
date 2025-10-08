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
    list_display = ('name', 'category', 'brand')
    list_filter = ('category', 'brand')
    search_fields = ('name', 'brand')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [PriceOfferInline]


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

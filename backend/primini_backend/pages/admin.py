from django.contrib import admin

from .models import FaqEntry, Page, SiteSettings, BlogPost, PageAdConfig


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug')
    prepopulated_fields = {'slug': ('title',)}


@admin.register(FaqEntry)
class FaqEntryAdmin(admin.ModelAdmin):
    list_display = ('question', 'section', 'position')
    list_filter = ('section',)
    ordering = ('section', 'position')


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ('key', 'value', 'updated_at')
    search_fields = ('key', 'value')
    readonly_fields = ('updated_at',)


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'status', 'author', 'published_at', 'created_at')
    list_filter = ('status', 'created_at', 'published_at')
    search_fields = ('title', 'slug', 'content', 'meta_title', 'meta_description')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Contenu', {
            'fields': ('title', 'slug', 'excerpt', 'content')
        }),
        ('Image mise en avant', {
            'fields': ('featured_image', 'featured_image_url')
        }),
        ('SEO', {
            'fields': ('meta_title', 'meta_description', 'meta_keywords'),
            'classes': ('collapse',)
        }),
        ('Publication', {
            'fields': ('status', 'author', 'published_at')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Set author if not set"""
        if not obj.author:
            obj.author = request.user
        super().save_model(request, obj, form, change)


@admin.register(PageAdConfig)
class PageAdConfigAdmin(admin.ModelAdmin):
    list_display = ('page_type', 'slot', 'ad_type', 'enabled', 'order', 'created_at')
    list_filter = ('page_type', 'slot', 'ad_type', 'enabled')
    search_fields = ('page_type', 'slot', 'adsense_id')
    ordering = ('page_type', 'slot', 'order')
    fieldsets = (
        ('Configuration de base', {
            'fields': ('page_type', 'slot', 'ad_type', 'enabled', 'order')
        }),
        ('AdSense', {
            'fields': ('adsense_id',),
            'classes': ('collapse',)
        }),
        ('Image bannière', {
            'fields': ('banner_image', 'banner_image_url', 'banner_link'),
            'classes': ('collapse',)
        }),
        ('Image de fond', {
            'fields': ('background_image', 'background_image_url'),
            'classes': ('collapse',)
        }),
        ('Code personnalisé', {
            'fields': ('custom_code',),
            'classes': ('collapse',)
        }),
    )

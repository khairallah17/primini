from django.contrib import admin

from .models import FaqEntry, Page


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug')
    prepopulated_fields = {'slug': ('title',)}


@admin.register(FaqEntry)
class FaqEntryAdmin(admin.ModelAdmin):
    list_display = ('question', 'section', 'position')
    list_filter = ('section',)
    ordering = ('section', 'position')

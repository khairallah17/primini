from rest_framework import serializers

from .models import FaqEntry, Page, SiteSettings


class PageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = ['id', 'title', 'slug', 'body']


class FaqEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = FaqEntry
        fields = ['id', 'section', 'question', 'answer', 'position']


class SiteSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = ['id', 'key', 'value', 'description', 'updated_at']
        read_only_fields = ['updated_at']


class AdSenseConfigSerializer(serializers.Serializer):
    """Serializer for AdSense configuration"""
    enabled = serializers.BooleanField()
    publisher_id = serializers.CharField(max_length=50, allow_blank=True)
    # Ad slot configurations - can be either AdSense ID string or AdSlotConfig object
    homepage_top = serializers.CharField(max_length=200, allow_blank=True, required=False)
    homepage_middle = serializers.CharField(max_length=200, allow_blank=True, required=False)
    homepage_bottom = serializers.CharField(max_length=200, allow_blank=True, required=False)
    product_detail_sidebar = serializers.CharField(max_length=200, allow_blank=True, required=False)
    product_detail_bottom = serializers.CharField(max_length=200, allow_blank=True, required=False)
    category_page_top = serializers.CharField(max_length=200, allow_blank=True, required=False)
    search_results_middle = serializers.CharField(max_length=200, allow_blank=True, required=False)

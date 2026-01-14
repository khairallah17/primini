from rest_framework import serializers

from .models import FaqEntry, Page, SiteSettings, BlogPost, PageAdConfig


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


class BlogPostSerializer(serializers.ModelSerializer):
    """Serializer for blog posts"""
    author_name = serializers.SerializerMethodField()
    featured_image_url_display = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'excerpt', 'content', 'featured_image',
            'featured_image_url', 'featured_image_url_display', 'meta_title',
            'meta_description', 'meta_keywords', 'status', 'author', 'author_name',
            'published_at', 'created_at', 'updated_at', 'is_published'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_published']

    def get_author_name(self, obj):
        """Get author's full name or email"""
        if obj.author:
            if obj.author.first_name or obj.author.last_name:
                return f"{obj.author.first_name} {obj.author.last_name}".strip()
            return obj.author.email
        return None

    def get_featured_image_url_display(self, obj):
        """Get featured image URL (prioritize uploaded file over external URL)"""
        if obj.featured_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.featured_image.url)
            return obj.featured_image.url
        return obj.featured_image_url or None


class PageAdConfigSerializer(serializers.ModelSerializer):
    """Serializer for page-specific ad configurations"""
    banner_image_url_display = serializers.SerializerMethodField()
    background_image_url_display = serializers.SerializerMethodField()

    class Meta:
        model = PageAdConfig
        fields = [
            'id', 'page_type', 'slot', 'ad_type', 'adsense_id',
            'banner_image', 'banner_image_url', 'banner_image_url_display', 'banner_link',
            'custom_code', 'background_image', 'background_image_url', 'background_image_url_display',
            'enabled', 'order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_banner_image_url_display(self, obj):
        """Get banner image URL (prioritize uploaded file over external URL)"""
        if obj.banner_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.banner_image.url)
            return obj.banner_image.url
        return obj.banner_image_url or None

    def get_background_image_url_display(self, obj):
        """Get background image URL (prioritize uploaded file over external URL)"""
        if obj.background_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.background_image.url)
            return obj.background_image.url
        return obj.background_image_url or None


class BlogPostListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for blog post listings"""
    author_name = serializers.SerializerMethodField()
    featured_image_url_display = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'excerpt', 'featured_image',
            'featured_image_url', 'featured_image_url_display', 'meta_title',
            'author_name', 'published_at', 'created_at', 'is_published'
        ]
        read_only_fields = ['created_at', 'is_published']

    def get_author_name(self, obj):
        """Get author's full name or email"""
        if obj.author:
            if obj.author.first_name or obj.author.last_name:
                return f"{obj.author.first_name} {obj.author.last_name}".strip()
            return obj.author.email
        return None

    def get_featured_image_url_display(self, obj):
        """Get featured image URL (prioritize uploaded file over external URL)"""
        if obj.featured_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.featured_image.url)
            return obj.featured_image.url
        return obj.featured_image_url or None

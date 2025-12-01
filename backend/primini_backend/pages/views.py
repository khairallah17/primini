from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny

from .models import FaqEntry, Page, SiteSettings
from .serializers import FaqEntrySerializer, PageSerializer, SiteSettingsSerializer, AdSenseConfigSerializer


class PageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Page.objects.all()
    serializer_class = PageSerializer
    lookup_field = 'slug'


class FaqEntryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FaqEntrySerializer

    def get_queryset(self):
        queryset = FaqEntry.objects.all()
        section = self.request.query_params.get('section')
        if section:
            queryset = queryset.filter(section=section)
        return queryset


class SiteSettingsViewSet(viewsets.ModelViewSet):
    queryset = SiteSettings.objects.all()
    serializer_class = SiteSettingsSerializer
    
    def get_permissions(self):
        """Only admins can modify, but anyone can read"""
        if self.action in ['list', 'retrieve', 'adsense_config']:
            return [AllowAny()]
        return [IsAdminUser()]
    
    @action(detail=False, methods=['get', 'post'])
    def adsense_config(self, request):
        """Get or update AdSense configuration"""
        if request.method == 'GET':
            # Get current AdSense settings
            config = {
                'enabled': SiteSettings.get_setting('adsense_enabled', 'false').lower() == 'true',
                'publisher_id': SiteSettings.get_setting('adsense_publisher_id', ''),
                'homepage_top': SiteSettings.get_setting('adsense_homepage_top', ''),
                'homepage_middle': SiteSettings.get_setting('adsense_homepage_middle', ''),
                'homepage_bottom': SiteSettings.get_setting('adsense_homepage_bottom', ''),
                'product_detail_sidebar': SiteSettings.get_setting('adsense_product_detail_sidebar', ''),
                'product_detail_bottom': SiteSettings.get_setting('adsense_product_detail_bottom', ''),
                'category_page_top': SiteSettings.get_setting('adsense_category_page_top', ''),
                'search_results_middle': SiteSettings.get_setting('adsense_search_results_middle', ''),
            }
            serializer = AdSenseConfigSerializer(config)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            if not request.user.is_authenticated or not (hasattr(request.user, 'is_admin') and (request.user.is_admin or request.user.is_superuser)):
                return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            
            serializer = AdSenseConfigSerializer(data=request.data)
            if serializer.is_valid():
                data = serializer.validated_data
                # Save all settings
                SiteSettings.set_setting('adsense_enabled', str(data['enabled']), 'AdSense enabled/disabled')
                SiteSettings.set_setting('adsense_publisher_id', data.get('publisher_id', ''), 'AdSense Publisher ID')
                SiteSettings.set_setting('adsense_homepage_top', data.get('homepage_top', ''), 'Homepage Top Ad Slot')
                SiteSettings.set_setting('adsense_homepage_middle', data.get('homepage_middle', ''), 'Homepage Middle Ad Slot')
                SiteSettings.set_setting('adsense_homepage_bottom', data.get('homepage_bottom', ''), 'Homepage Bottom Ad Slot')
                SiteSettings.set_setting('adsense_product_detail_sidebar', data.get('product_detail_sidebar', ''), 'Product Detail Sidebar Ad Slot')
                SiteSettings.set_setting('adsense_product_detail_bottom', data.get('product_detail_bottom', ''), 'Product Detail Bottom Ad Slot')
                SiteSettings.set_setting('adsense_category_page_top', data.get('category_page_top', ''), 'Category Page Top Ad Slot')
                SiteSettings.set_setting('adsense_search_results_middle', data.get('search_results_middle', ''), 'Search Results Middle Ad Slot')
                
                return Response({'detail': 'AdSense configuration updated successfully'}, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

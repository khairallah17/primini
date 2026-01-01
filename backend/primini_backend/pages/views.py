import os
import json
import uuid
from datetime import datetime
from pathlib import Path
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

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
        if self.action == 'upload_banner_image':
            return [IsAdminUser()]
        return [IsAdminUser()]
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_banner_image(self, request):
        """Upload a banner image for AdSense"""
        if not request.user.is_authenticated or not (hasattr(request.user, 'is_admin') and (request.user.is_admin or request.user.is_superuser)):
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        if 'file' not in request.FILES:
            return Response({'detail': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            return Response({'detail': 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file size (max 5MB)
        if file.size > 5 * 1024 * 1024:
            return Response({'detail': 'File too large. Maximum size is 5MB.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create adsense directory if it doesn't exist
        adsense_dir = Path(settings.MEDIA_ROOT) / 'adsense'
        adsense_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        slot_key = request.data.get('slot_key', 'banner')
        file_ext = os.path.splitext(file.name)[1] or '.jpg'
        # Sanitize original filename
        original_name = "".join(c for c in os.path.splitext(file.name)[0] if c.isalnum() or c in ('-', '_'))[:50]
        # Create unique filename with timestamp and UUID
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        filename = f'{slot_key}_{original_name}_{timestamp}_{unique_id}{file_ext}'
        
        # Save file
        file_path = adsense_dir / filename
        with open(file_path, 'wb') as f:
            for chunk in file.chunks():
                f.write(chunk)
        
        # Return the URL
        file_url = f'{settings.MEDIA_URL}adsense/{filename}'
        return Response({'url': file_url, 'filename': filename}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get', 'post'])
    def adsense_config(self, request):
        """Get or update AdSense configuration"""
        
        if request.method == 'GET':
            # Get current AdSense settings
            # Each slot can be either a simple string (AdSense ID) or JSON (banner config)
            def get_slot_config(key):
                value = SiteSettings.get_setting(key, '')
                if not value:
                    return ''
                # Try to parse as JSON (banner config), otherwise return as string (AdSense ID)
                try:
                    return json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    return value
            
            config = {
                'enabled': SiteSettings.get_setting('adsense_enabled', 'false').lower() == 'true',
                'publisher_id': SiteSettings.get_setting('adsense_publisher_id', ''),
                'homepage_top': get_slot_config('adsense_homepage_top'),
                'homepage_middle': get_slot_config('adsense_homepage_middle'),
                'homepage_bottom': get_slot_config('adsense_homepage_bottom'),
                'product_detail_sidebar': get_slot_config('adsense_product_detail_sidebar'),
                'product_detail_bottom': get_slot_config('adsense_product_detail_bottom'),
                'category_page_top': get_slot_config('adsense_category_page_top'),
                'search_results_middle': get_slot_config('adsense_search_results_middle'),
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
                
                # Save slot configurations (can be string or JSON)
                def save_slot_config(key, value):
                    if not value:
                        SiteSettings.set_setting(key, '', f'{key.replace("adsense_", "").replace("_", " ").title()} Ad Slot')
                    elif isinstance(value, dict):
                        # Save as JSON for banner configs
                        SiteSettings.set_setting(key, json.dumps(value), f'{key.replace("adsense_", "").replace("_", " ").title()} Ad Slot')
                    elif isinstance(value, str):
                        # Check if it's already a JSON string
                        try:
                            parsed = json.loads(value)
                            # If it parses successfully and is an object, save as JSON
                            if isinstance(parsed, dict):
                                SiteSettings.set_setting(key, value, f'{key.replace("adsense_", "").replace("_", " ").title()} Ad Slot')
                            else:
                                # It's a plain string (AdSense ID)
                                SiteSettings.set_setting(key, value, f'{key.replace("adsense_", "").replace("_", " ").title()} Ad Slot')
                        except (json.JSONDecodeError, TypeError):
                            # It's a plain string (AdSense ID)
                            SiteSettings.set_setting(key, str(value), f'{key.replace("adsense_", "").replace("_", " ").title()} Ad Slot')
                    else:
                        # Save as string for AdSense IDs
                        SiteSettings.set_setting(key, str(value), f'{key.replace("adsense_", "").replace("_", " ").title()} Ad Slot')
                
                save_slot_config('adsense_homepage_top', data.get('homepage_top', ''))
                save_slot_config('adsense_homepage_middle', data.get('homepage_middle', ''))
                save_slot_config('adsense_homepage_bottom', data.get('homepage_bottom', ''))
                save_slot_config('adsense_product_detail_sidebar', data.get('product_detail_sidebar', ''))
                save_slot_config('adsense_product_detail_bottom', data.get('product_detail_bottom', ''))
                save_slot_config('adsense_category_page_top', data.get('category_page_top', ''))
                save_slot_config('adsense_search_results_middle', data.get('search_results_middle', ''))
                
                return Response({'detail': 'AdSense configuration updated successfully'}, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

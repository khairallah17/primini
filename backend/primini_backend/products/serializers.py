from django.utils import timezone
from rest_framework import serializers

from .models import Category, Merchant, PopularProduct, PriceOffer, Product, ProductImage, Promotion


class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'parent', 'children']

    def get_children(self, obj):
        return CategorySerializer(obj.children.all(), many=True).data


class MerchantSerializer(serializers.ModelSerializer):
    logo_display = serializers.SerializerMethodField()

    class Meta:
        model = Merchant
        fields = ['id', 'name', 'logo', 'logo_file', 'logo_display', 'website', 'description', 'pay_status']
        read_only_fields = ['logo_display']

    def get_logo_display(self, obj):
        """Return the logo URL - either from uploaded file or external URL"""
        request = self.context.get('request')
        
        if obj.logo_file:
            if request:
                return request.build_absolute_uri(obj.logo_file.url)
            return obj.logo_file.url
        elif obj.logo:
            # If logo is a relative path (starts with /media/), prepend backend URL
            if obj.logo.startswith('/media/') or obj.logo.startswith('media/'):
                if request:
                    # Remove leading slash if present to avoid double slashes
                    logo_path = obj.logo.lstrip('/')
                    return request.build_absolute_uri(f'/{logo_path}')
                # Fallback: construct URL from settings if no request context
                from django.conf import settings
                base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
                logo_path = obj.logo.lstrip('/')
                return f'{base_url}/{logo_path}'
            # If it's already an absolute URL (http/https), return as-is
            return obj.logo
        return None


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    subcategory = CategorySerializer(read_only=True)
    lowest_price = serializers.SerializerMethodField()
    approval_status = serializers.CharField(read_only=True)
    image_file = serializers.ImageField(read_only=True)
    image_display = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'image',
            'image_file',
            'image_display',
            'brand',
            'category',
            'subcategory',
            'lowest_price',
            'tags',
            'approval_status',
        ]
    
    def get_image_display(self, obj):
        """Return the image URL - either from uploaded file or external URL"""
        request = self.context.get('request')
        
        # Prefer image_file over image
        if obj.image_file:
            if request:
                return request.build_absolute_uri(obj.image_file.url)
            # Fallback: construct URL from settings if no request context
            from django.conf import settings
            base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
            return f'{base_url}{obj.image_file.url}'
        elif obj.image:
            # If image is a relative path (starts with /media/ or media/), prepend backend URL
            if obj.image.startswith('/media/') or obj.image.startswith('media/'):
                if request:
                    image_path = obj.image.lstrip('/')
                    return request.build_absolute_uri(f'/{image_path}')
                # Fallback: construct URL from settings if no request context
                from django.conf import settings
                base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
                image_path = obj.image.lstrip('/')
                return f'{base_url}/{image_path}'
            # If it's already an absolute URL (http/https), return as-is
            return obj.image
        return None

    def get_lowest_price(self, obj):
        if hasattr(obj, 'lowest_price') and obj.lowest_price is not None:
            return obj.lowest_price
        offer = obj.offers.order_by('price').first()
        return offer.price if offer else None


class PriceOfferSerializer(serializers.ModelSerializer):
    merchant = MerchantSerializer(read_only=True)
    product = ProductListSerializer(read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    approved_by_email = serializers.EmailField(source='approved_by.email', read_only=True)

    class Meta:
        model = PriceOffer
        fields = [
            'id', 'product', 'merchant', 'price', 'currency', 'raw_price_text', 
            'stock_status', 'url', 'date_updated', 'approval_status', 
            'created_by_email', 'approved_by_email', 'approved_at', 'rejection_reason'
        ]


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer for product images (supports both uploaded files and URLs)"""
    image_url_display = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url', 'image_url_display', 'order']
        read_only_fields = ['id', 'image_url_display']

    def get_image_url_display(self, obj):
        """Return the image URL - either from uploaded file or external URL"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        elif obj.image_url:
            return obj.image_url
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    subcategory = CategorySerializer(read_only=True)
    offers = PriceOfferSerializer(many=True, read_only=True)
    similar_products = ProductListSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    approved_by_email = serializers.EmailField(source='approved_by.email', read_only=True)
    image_file = serializers.ImageField(read_only=True)
    image_display = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'specs',
            'image',
            'image_file',
            'image_display',
            'images',
            'category',
            'subcategory',
            'brand',
            'release_date',
            'tags',
            'source_category',
            'raw_price_map',
            'raw_url_map',
            'offers',
            'similar_products',
            'approval_status',
            'created_by_email',
            'approved_by_email',
            'approved_at',
            'rejection_reason',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['slug', 'created_at', 'updated_at', 'approved_at']
    
    def get_image_display(self, obj):
        """Return the image URL - either from uploaded file or external URL"""
        request = self.context.get('request')
        
        # Prefer image_file over image
        if obj.image_file:
            if request:
                return request.build_absolute_uri(obj.image_file.url)
            # Fallback: construct URL from settings if no request context
            from django.conf import settings
            base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
            return f'{base_url}{obj.image_file.url}'
        elif obj.image:
            # If image is a relative path (starts with /media/ or media/), prepend backend URL
            if obj.image.startswith('/media/') or obj.image.startswith('media/'):
                if request:
                    image_path = obj.image.lstrip('/')
                    return request.build_absolute_uri(f'/{image_path}')
                # Fallback: construct URL from settings if no request context
                from django.conf import settings
                base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
                image_path = obj.image.lstrip('/')
                return f'{base_url}/{image_path}'
            # If it's already an absolute URL (http/https), return as-is
            return obj.image
        return None


class PriceOfferCreateSerializer(serializers.Serializer):
    """Serializer for creating price offers within product creation/update."""
    merchant_id = serializers.IntegerField(required=False, allow_null=True)
    merchant_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    url = serializers.URLField(required=False, allow_blank=True)
    stock_status = serializers.ChoiceField(
        choices=[('in_stock', 'En stock'), ('low_stock', 'Stock faible'), ('out_of_stock', 'Rupture de stock')],
        default='in_stock',
        required=False
    )
    currency = serializers.CharField(max_length=8, default='MAD', required=False)
    
    def validate(self, data):
        """Ensure either merchant_id or merchant_name is provided"""
        if not data.get('merchant_id') and not data.get('merchant_name'):
            raise serializers.ValidationError("Either merchant_id or merchant_name must be provided")
        return data


class PriceOfferSubmitSerializer(serializers.Serializer):
    """Serializer for users to submit new price offers"""
    merchant_id = serializers.IntegerField(required=False, allow_null=True)
    merchant_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    url = serializers.URLField(required=False, allow_blank=True)
    stock_status = serializers.ChoiceField(
        choices=[('in_stock', 'En stock'), ('low_stock', 'Stock faible'), ('out_of_stock', 'Rupture de stock')],
        default='in_stock',
        required=False
    )
    currency = serializers.CharField(max_length=8, default='MAD', required=False)
    
    def validate(self, data):
        """Ensure either merchant_id or merchant_name is provided"""
        if not data.get('merchant_id') and not data.get('merchant_name'):
            raise serializers.ValidationError("Either merchant_id or merchant_name must be provided")
        return data


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    category_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    subcategory_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    offers = PriceOfferCreateSerializer(many=True, required=False, write_only=True)
    images = serializers.ListField(
        child=serializers.ImageField(allow_empty_file=False),
        write_only=True,
        required=False,
        allow_empty=True,
        help_text='List of image files to upload'
    )
    image_urls = serializers.ListField(
        child=serializers.URLField(),
        write_only=True,
        required=False,
        allow_empty=True,
        help_text='List of image URLs (alternative to uploaded files)'
    )

    def to_internal_value(self, data):
        """Parse FormData nested offers array before validation"""
        # Check if we need to parse FormData offers
        request = self.context.get('request')
        
        # Check if offers are already in data as a list (from JSON)
        if 'offers' in data and isinstance(data.get('offers'), list):
            return super().to_internal_value(data)
        
        # Check if offers are in FormData format (offers[0][price])
        # We need to check both the data parameter (which is request.data) and request.POST
        offer_keys = {}
        data_sources = []
        
        # Add the data parameter itself (which is request.data for FormData)
        if hasattr(data, 'keys'):
            data_sources.append(data)
        elif isinstance(data, dict):
            data_sources.append(data)
        
        # Also check request.data and request.POST if available
        if request:
            if hasattr(request, 'data') and request.data not in data_sources:
                data_sources.append(request.data)
            if hasattr(request, 'POST') and request.POST not in data_sources:
                data_sources.append(request.POST)
        
        has_formdata_offers = False
        for data_source in data_sources:
            # Handle both dict-like and QueryDict-like objects
            try:
                keys = list(data_source.keys()) if hasattr(data_source, 'keys') else []
            except (TypeError, AttributeError):
                keys = []
            
            for key in keys:
                if key.startswith('offers[') and ']' in key:
                    has_formdata_offers = True
                    try:
                        # Handle offers[0][price] format
                        parts = key.split('[')
                        if len(parts) >= 3:
                            index_part = parts[1].rstrip(']')
                            field_part = parts[2].rstrip(']')
                            index = int(index_part)
                            if index not in offer_keys:
                                offer_keys[index] = {}
                            
                            # Get value - handle both dict.get() and QueryDict.get()
                            try:
                                if hasattr(data_source, 'get'):
                                    value = data_source.get(key)
                                elif isinstance(data_source, dict):
                                    value = data_source.get(key)
                                else:
                                    # Try direct access
                                    value = data_source[key] if key in data_source else None
                            except (KeyError, TypeError):
                                value = None
                            
                            # Add value - don't filter out any values, let serializer handle validation
                            # This ensures price field is always included if it was sent
                            if value is not None:
                                # Convert to string
                                str_value = str(value)
                                offer_keys[index][field_part] = str_value
                    except (ValueError, IndexError) as e:
                        continue
        
        # Convert to list format and add to data
        if has_formdata_offers and offer_keys:
            offers_list = []
            max_index = max(offer_keys.keys())
            for i in range(max_index + 1):
                if i in offer_keys and offer_keys[i]:
                    # Add offer if it has at least merchant_id or merchant_name
                    # Price might be missing, but let serializer validate that
                    offer = offer_keys[i]
                    if 'merchant_id' in offer or 'merchant_name' in offer:
                        offers_list.append(offer)
            
            if offers_list:
                # Create a mutable copy of data
                from django.http import QueryDict
                if isinstance(data, QueryDict):
                    # Make QueryDict mutable and copy all data
                    mutable_data = data.copy()
                    mutable_data._mutable = True
                    # Remove old offers[0][...] keys
                    keys_to_remove = [k for k in list(mutable_data.keys()) if k.startswith('offers[')]
                    for key in keys_to_remove:
                        del mutable_data[key]
                elif isinstance(data, dict):
                    mutable_data = data.copy()
                    # Remove old offers[0][...] keys
                    keys_to_remove = [k for k in list(mutable_data.keys()) if k.startswith('offers[')]
                    for key in keys_to_remove:
                        mutable_data.pop(key, None)
                else:
                    mutable_data = QueryDict(mutable=True)
                    # Copy all existing data except offers
                    if hasattr(data, 'keys'):
                        for key in data.keys():
                            if not key.startswith('offers['):
                                try:
                                    if hasattr(data, 'get'):
                                        value = data.get(key)
                                    elif isinstance(data, dict):
                                        value = data.get(key)
                                    else:
                                        value = getattr(data, key, None)
                                    if value is not None:
                                        mutable_data[key] = value
                                except (KeyError, AttributeError):
                                    pass
                
                # Set offers as a list - DRF's nested serializer will handle this
                # Convert QueryDict to dict for nested structures
                if isinstance(mutable_data, QueryDict):
                    # Convert to regular dict for nested serializer
                    data_dict = {}
                    for key in mutable_data.keys():
                        if key != 'offers':
                            data_dict[key] = mutable_data.get(key)
                    data_dict['offers'] = offers_list
                    data = data_dict
                else:
                    mutable_data['offers'] = offers_list
                    data = mutable_data
        
        return super().to_internal_value(data)

    class Meta:
        model = Product
        fields = [
            'name',
            'description',
            'specs',
            'image',
            'images',
            'image_urls',
            'category_id',
            'subcategory_id',
            'brand',
            'release_date',
            'tags',
            'source_category',
            'raw_price_map',
            'raw_url_map',
            'offers',
        ]

    def create(self, validated_data):
        offers_data = validated_data.pop('offers', [])
        images_data = validated_data.pop('images', [])
        image_urls_data = validated_data.pop('image_urls', [])
        # Handle images from request.FILES if not in validated_data
        request = self.context['request']
        if not images_data and hasattr(request, 'FILES'):
            images_data = list(request.FILES.getlist('images', []))
        # Handle image URLs from request.data if not in validated_data
        if not image_urls_data and hasattr(request, 'data'):
            image_urls_list = request.data.getlist('image_urls', [])
            image_urls_data = [url for url in image_urls_list if url]  # Filter out empty strings
        category_id = validated_data.pop('category_id', None)
        subcategory_id = validated_data.pop('subcategory_id', None)
        user = request.user
        
        # Set category if provided
        if category_id:
            from .models import Category
            try:
                validated_data['category'] = Category.objects.get(id=category_id)
            except Category.DoesNotExist:
                pass
        
        # Set subcategory if provided
        if subcategory_id:
            from .models import Category
            try:
                subcategory = Category.objects.get(id=subcategory_id)
                # Validate that it's actually a subcategory (has a parent)
                if subcategory.parent:
                    validated_data['subcategory'] = subcategory
            except Category.DoesNotExist:
                pass
        
        # Set approval status based on user role
        if user.is_admin:
            validated_data['approval_status'] = 'approved'
            validated_data['approved_by'] = user
        else:
            validated_data['approval_status'] = 'pending'
        
        validated_data['created_by'] = user
        product = super().create(validated_data)
        
        # Create product images from uploaded files
        order = 0
        if images_data:
            for image_file in images_data:
                ProductImage.objects.create(
                    product=product,
                    image=image_file,
                    image_url='',
                    order=order
                )
                order += 1
        
        # Create product images from URLs
        if image_urls_data:
            for image_url in image_urls_data:
                ProductImage.objects.create(
                    product=product,
                    image=None,
                    image_url=image_url,
                    order=order
                )
                order += 1
        
        # Create price offers
        if offers_data:
            for offer_data in offers_data:
                merchant_id = offer_data.pop('merchant_id', None)
                merchant_name = offer_data.pop('merchant_name', None)
                try:
                    if merchant_id:
                        merchant = Merchant.objects.get(id=merchant_id)
                    elif merchant_name:
                        # Create new merchant if merchant_name is provided
                        merchant, _ = Merchant.objects.get_or_create(name=merchant_name.strip())
                    else:
                        continue  # Skip if no merchant_id or merchant_name
                    
                    PriceOffer.objects.create(
                        product=product,
                        merchant=merchant,
                        **offer_data
                    )
                except Merchant.DoesNotExist:
                    pass  # Skip invalid merchant
        
        return product

    def update(self, instance, validated_data):
        offers_data = validated_data.pop('offers', None)
        images_data = validated_data.pop('images', None)
        image_urls_data = validated_data.pop('image_urls', None)
        request = self.context['request']
        # Handle images from request.FILES if not in validated_data
        if images_data is None and hasattr(request, 'FILES'):
            files = request.FILES.getlist('images', [])
            images_data = files if files else None
        # Handle image URLs from request.data if not in validated_data
        if image_urls_data is None and hasattr(request, 'data'):
            image_urls_list = request.data.getlist('image_urls', [])
            image_urls_data = [url for url in image_urls_list if url] if image_urls_list else None
        category_id = validated_data.pop('category_id', None)
        subcategory_id = validated_data.pop('subcategory_id', None)
        user = request.user
        
        # Set category if provided
        if category_id:
            from .models import Category
            try:
                validated_data['category'] = Category.objects.get(id=category_id)
            except Category.DoesNotExist:
                pass
        
        # Set subcategory if provided
        if subcategory_id is not None:
            from .models import Category
            if subcategory_id:
                try:
                    subcategory = Category.objects.get(id=subcategory_id)
                    # Validate that it's actually a subcategory (has a parent)
                    if subcategory.parent:
                        validated_data['subcategory'] = subcategory
                except Category.DoesNotExist:
                    pass
            else:
                # Allow clearing subcategory by passing null
                validated_data['subcategory'] = None
        
        # If client updates, reset to pending unless admin
        if not user.is_admin and instance.approval_status == 'approved':
            validated_data['approval_status'] = 'pending'
            validated_data['approved_by'] = None
            validated_data['approved_at'] = None
        
        product = super().update(instance, validated_data)
        
        # Update product images if provided
        if images_data is not None or image_urls_data is not None:
            # Delete existing images
            instance.images.all().delete()
            
            # Create new images from uploaded files
            order = 0
            if images_data and len(images_data) > 0:
                for image_file in images_data:
                    ProductImage.objects.create(
                        product=product,
                        image=image_file,
                        image_url='',
                        order=order
                    )
                    order += 1
            
            # Create new images from URLs
            if image_urls_data and len(image_urls_data) > 0:
                for image_url in image_urls_data:
                    ProductImage.objects.create(
                        product=product,
                        image=None,
                        image_url=image_url,
                        order=order
                    )
                    order += 1
        
        # Update price offers if provided
        if offers_data is not None:
            # Delete existing offers
            instance.offers.all().delete()
            
            # Create new offers
            if offers_data:  # Only create if there are offers to create
                for offer_data in offers_data:
                    merchant_id = offer_data.pop('merchant_id', None)
                    merchant_name = offer_data.pop('merchant_name', None)
                    try:
                        if merchant_id:
                            merchant = Merchant.objects.get(id=merchant_id)
                        elif merchant_name:
                            # Create new merchant if merchant_name is provided
                            merchant, _ = Merchant.objects.get_or_create(name=merchant_name.strip())
                        else:
                            continue  # Skip if no merchant_id or merchant_name
                        
                        # Set created_by to current user
                        PriceOffer.objects.create(
                            product=product,
                            merchant=merchant,
                            created_by=user,
                            approval_status='approved' if user.is_admin else 'pending',
                            approved_by=user if user.is_admin else None,
                            approved_at=timezone.now() if user.is_admin else None,
                            **offer_data
                        )
                    except Merchant.DoesNotExist:
                        pass  # Skip invalid merchant
            # If offers_data is empty list, all offers are deleted (handled by delete above)
        
        return product


class PromotionSerializer(serializers.ModelSerializer):
    products = ProductListSerializer(many=True, read_only=True)

    class Meta:
        model = Promotion
        fields = ['id', 'title', 'description', 'products', 'start_date', 'end_date']


class PopularProductSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = PopularProduct
        fields = ['id', 'product', 'position']

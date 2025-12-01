from rest_framework import serializers

from .models import Category, Merchant, PopularProduct, PriceOffer, Product, Promotion


class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'parent', 'children']

    def get_children(self, obj):
        return CategorySerializer(obj.children.all(), many=True).data


class MerchantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = ['id', 'name', 'logo', 'website', 'description', 'pay_status']


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    lowest_price = serializers.SerializerMethodField()
    approval_status = serializers.CharField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'image',
            'brand',
            'category',
            'lowest_price',
            'tags',
            'approval_status',
        ]

    def get_lowest_price(self, obj):
        if hasattr(obj, 'lowest_price') and obj.lowest_price is not None:
            return obj.lowest_price
        offer = obj.offers.order_by('price').first()
        return offer.price if offer else None


class PriceOfferSerializer(serializers.ModelSerializer):
    merchant = MerchantSerializer(read_only=True)
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = PriceOffer
        fields = ['id', 'product', 'merchant', 'price', 'currency', 'raw_price_text', 'stock_status', 'url', 'date_updated']


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    offers = PriceOfferSerializer(many=True, read_only=True)
    similar_products = ProductListSerializer(many=True, read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    approved_by_email = serializers.EmailField(source='approved_by.email', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'specs',
            'image',
            'category',
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


class PriceOfferCreateSerializer(serializers.Serializer):
    """Serializer for creating price offers within product creation/update."""
    merchant_id = serializers.IntegerField(required=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    url = serializers.URLField(required=False, allow_blank=True)
    stock_status = serializers.ChoiceField(
        choices=[('in_stock', 'En stock'), ('low_stock', 'Stock faible'), ('out_of_stock', 'Rupture de stock')],
        default='in_stock',
        required=False
    )
    currency = serializers.CharField(max_length=8, default='MAD', required=False)


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    category_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    offers = PriceOfferCreateSerializer(many=True, required=False, write_only=True)

    class Meta:
        model = Product
        fields = [
            'name',
            'description',
            'specs',
            'image',
            'category_id',
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
        category_id = validated_data.pop('category_id', None)
        user = self.context['request'].user
        
        # Set category if provided
        if category_id:
            from .models import Category
            try:
                validated_data['category'] = Category.objects.get(id=category_id)
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
        
        # Create price offers
        for offer_data in offers_data:
            merchant_id = offer_data.pop('merchant_id')
            try:
                merchant = Merchant.objects.get(id=merchant_id)
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
        category_id = validated_data.pop('category_id', None)
        user = self.context['request'].user
        
        # Set category if provided
        if category_id:
            from .models import Category
            try:
                validated_data['category'] = Category.objects.get(id=category_id)
            except Category.DoesNotExist:
                pass
        
        # If client updates, reset to pending unless admin
        if not user.is_admin and instance.approval_status == 'approved':
            validated_data['approval_status'] = 'pending'
            validated_data['approved_by'] = None
            validated_data['approved_at'] = None
        
        product = super().update(instance, validated_data)
        
        # Update price offers if provided
        if offers_data is not None:
            # Delete existing offers
            instance.offers.all().delete()
            
            # Create new offers
            for offer_data in offers_data:
                merchant_id = offer_data.pop('merchant_id')
                try:
                    merchant = Merchant.objects.get(id=merchant_id)
                    PriceOffer.objects.create(
                        product=product,
                        merchant=merchant,
                        **offer_data
                    )
                except Merchant.DoesNotExist:
                    pass  # Skip invalid merchant
        
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

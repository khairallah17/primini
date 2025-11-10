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
        ]


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

from rest_framework import serializers

from primini_backend.products.models import Product
from primini_backend.products.serializers import ProductListSerializer
from .models import Alert


class AlertSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), source='product', write_only=True)

    class Meta:
        model = Alert
        fields = ['id', 'product', 'product_id', 'threshold_price', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

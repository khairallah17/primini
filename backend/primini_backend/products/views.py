from django.db.models import Min, Q
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Category, Merchant, PopularProduct, PriceOffer, Product, Promotion
from .serializers import (
    CategorySerializer,
    MerchantSerializer,
    PopularProductSerializer,
    PriceOfferSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    PromotionSerializer,
)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.prefetch_related('children').all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'


class MerchantViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Merchant.objects.all()
    serializer_class = MerchantSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductListSerializer
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'brand']
    ordering_fields = ['name', 'brand', 'lowest_price']

    def get_queryset(self):
        queryset = Product.objects.select_related('category').prefetch_related('offers__merchant')
        queryset = queryset.annotate(lowest_price=Min('offers__price'))

        category_slug = self.request.query_params.get('category')
        if category_slug:
            queryset = queryset.filter(Q(category__slug=category_slug) | Q(category__parent__slug=category_slug))

        brand = self.request.query_params.get('brand')
        if brand:
            queryset = queryset.filter(brand__iexact=brand)

        price_min = self.request.query_params.get('price_min')
        if price_min:
            queryset = queryset.filter(offers__price__gte=price_min)

        price_max = self.request.query_params.get('price_max')
        if price_max:
            queryset = queryset.filter(offers__price__lte=price_max)

        tags = self.request.query_params.getlist('tags')
        if tags:
            for tag in tags:
                queryset = queryset.filter(tags__contains=[tag])

        return queryset.distinct()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return super().get_serializer_class()

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        product = self.get_object()
        similar_products = Product.objects.filter(category=product.category).exclude(id=product.id)[:12]
        response.data['similar_products'] = ProductListSerializer(similar_products, many=True).data
        return response

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        queryset = self.filter_queryset(self.get_queryset().filter(name__icontains=query))
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def magic_lookup(self, request):
        link = request.data.get('link', '')
        if not link:
            return Response({'detail': 'Aucun lien fourni.'}, status=400)
        # Placeholder implementation
        return Response({
            'link': link,
            'message': "Analyse simulée du lien. Implémentez la logique de scraping côté serveur.",
        })


class PriceOfferViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PriceOffer.objects.select_related('product', 'product__category', 'merchant')
    serializer_class = PriceOfferSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['price', 'date_updated']


class PromotionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Promotion.objects.prefetch_related('products__offers__merchant')
    serializer_class = PromotionSerializer


class PopularProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PopularProduct.objects.select_related('product', 'product__category')
    serializer_class = PopularProductSerializer

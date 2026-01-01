import csv
import io
from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.db.models import Min, Q
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

try:
    import openpyxl
    EXCEL_SUPPORT = True
except ImportError:
    EXCEL_SUPPORT = False

from rest_framework.permissions import IsAuthenticated
from primini_backend.users.permissions import IsAdminOrClient, IsAdminOrReadOnly, CanApproveProduct, IsAdmin

from .models import Category, Merchant, PopularProduct, PriceOffer, Product, Promotion
from .serializers import (
    CategorySerializer,
    MerchantSerializer,
    PopularProductSerializer,
    PriceOfferSerializer,
    ProductCreateUpdateSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    PromotionSerializer,
)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.prefetch_related('children').all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    @action(detail=True, methods=['get'])
    def products(self, request, slug=None):
        """
        Get all products for a specific category.
        Supports filtering by subcategory, brand, price range, etc.
        """
        category = self.get_object()
        
        # Start with base queryset
        queryset = Product.objects.select_related(
            'category', 'subcategory', 'created_by', 'approved_by'
        ).prefetch_related('offers__merchant')
        # Only count approved offers for lowest_price
        queryset = queryset.annotate(lowest_price=Min('offers__price', filter=Q(offers__approval_status='approved')))
        
        # Filter by approval status
        if not request.user.is_authenticated:
            queryset = queryset.filter(approval_status='approved')
        elif not request.user.is_admin:
            queryset = queryset.filter(
                Q(approval_status='approved') |
                Q(approval_status='pending', created_by=request.user)
            )
        
        # Filter by category (parent category or subcategory)
        if category.parent is None:
            # It's a parent category - get products with this category or its subcategories
            queryset = queryset.filter(
                Q(category=category) | Q(subcategory__parent=category)
            )
        else:
            # It's a subcategory - get products with this subcategory
            queryset = queryset.filter(subcategory=category)
        
        # Additional filters
        subcategory_slug = request.query_params.get('subcategory')
        if subcategory_slug:
            queryset = queryset.filter(subcategory__slug=subcategory_slug)
        
        brand = request.query_params.get('brand')
        if brand:
            queryset = queryset.filter(brand__iexact=brand)
        
        price_min = request.query_params.get('price_min')
        if price_min:
            try:
                queryset = queryset.filter(offers__price__gte=float(price_min))
            except ValueError:
                pass
        
        price_max = request.query_params.get('price_max')
        if price_max:
            try:
                queryset = queryset.filter(offers__price__lte=float(price_max))
            except ValueError:
                pass
        
        tags = request.query_params.getlist('tags')
        if tags:
            for tag in tags:
                queryset = queryset.filter(tags__contains=[tag])
        
        # Ordering
        ordering = request.query_params.get('ordering', '-created_at')
        if ordering.lstrip('-') in ['name', 'brand', 'lowest_price', 'created_at']:
            queryset = queryset.order_by(ordering)
        
        # Pagination
        page = self.paginate_queryset(queryset.distinct())
        if page is not None:
            serializer = ProductListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ProductListSerializer(queryset.distinct(), many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def subcategories(self, request, slug=None):
        """
        Get all subcategories for a parent category.
        """
        category = self.get_object()
        
        if category.parent is not None:
            return Response({
                'detail': 'This endpoint is only available for parent categories.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        subcategories = Category.objects.filter(parent=category).order_by('name')
        serializer = CategorySerializer(subcategories, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def parents(self, request):
        """
        Get all parent categories (categories without a parent).
        """
        parent_categories = Category.objects.filter(parent__isnull=True).order_by('name')
        page = self.paginate_queryset(parent_categories)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(parent_categories, many=True)
        return Response(serializer.data)


class MerchantViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Merchant.objects.all()
    serializer_class = MerchantSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductListSerializer
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'brand']
    ordering_fields = ['name', 'brand', 'lowest_price']
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Product.objects.select_related('category', 'created_by', 'approved_by').prefetch_related('offers__merchant', 'images')
        queryset = queryset.annotate(lowest_price=Min('offers__price'))

        # Filter by approval status
        # Admins can see all, clients see only approved or their own pending products
        if not self.request.user.is_authenticated:
            queryset = queryset.filter(approval_status='approved')
        elif not self.request.user.is_admin:
            queryset = queryset.filter(
                Q(approval_status='approved') |
                Q(approval_status='pending', created_by=self.request.user)
            )

        category_slug = self.request.query_params.get('category')
        if category_slug:
            queryset = queryset.filter(Q(category__slug=category_slug) | Q(category__parent__slug=category_slug))
        
        subcategory_slug = self.request.query_params.get('subcategory')
        if subcategory_slug:
            queryset = queryset.filter(subcategory__slug=subcategory_slug)

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

        # Admin can filter by approval status
        if self.request.user.is_authenticated and self.request.user.is_admin:
            approval_status = self.request.query_params.get('approval_status')
            if approval_status:
                queryset = queryset.filter(approval_status=approval_status)

        return queryset.distinct()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return ProductCreateUpdateSerializer
        return super().get_serializer_class()

    def get_parser_classes(self):
        """Use MultiPartParser for file uploads"""
        if self.action in ['create', 'update', 'partial_update']:
            return [MultiPartParser, FormParser]
        return super().get_parser_classes()

    def _parse_formdata_offers(self, request):
        """Parse offers from FormData nested array format (offers[0][price], etc.)"""
        offers = []
        offer_keys = {}
        
        # Check request.data (QueryDict from MultiPartParser/FormParser)
        data_source = request.data if hasattr(request, 'data') else None
        
        if data_source:
            for key in data_source.keys():
                if key.startswith('offers[') and ']' in key:
                    try:
                        parts = key.split('[')
                        if len(parts) >= 3:
                            index_part = parts[1].rstrip(']')
                            field_part = parts[2].rstrip(']')
                            index = int(index_part)
                            if index not in offer_keys:
                                offer_keys[index] = {}
                            value = data_source.get(key)
                            if value is not None:
                                offer_keys[index][field_part] = str(value)
                    except (ValueError, IndexError):
                        continue
        
        # Convert to list format
        if offer_keys:
            max_index = max(offer_keys.keys())
            for i in range(max_index + 1):
                if i in offer_keys and offer_keys[i]:
                    offer = offer_keys[i]
                    if 'merchant_id' in offer or 'merchant_name' in offer:
                        offers.append(offer)
        
        return offers if offers else None

    def update(self, request, *args, **kwargs):
        """Override update to parse FormData offers array"""
        # Parse offers from FormData if needed
        offers_data = self._parse_formdata_offers(request)
        if offers_data is not None and hasattr(request, 'data'):
            # The serializer's to_internal_value will handle the parsing
            # We just need to ensure the offers are available in a format it can parse
            # The serializer already handles FormData format, so we don't need to convert here
            pass  # Let the serializer handle it via to_internal_value
        
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """Override partial_update to parse FormData offers array"""
        # Parse offers from FormData if needed
        offers_data = self._parse_formdata_offers(request)
        if offers_data is not None and hasattr(request, 'data'):
            # The serializer's to_internal_value will handle the parsing
            # We just need to ensure the offers are available in a format it can parse
            # The serializer already handles FormData format, so we don't need to convert here
            pass  # Let the serializer handle it via to_internal_value
        
        return super().partial_update(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """Override create to parse FormData offers array"""
        # Parse offers from FormData if needed
        offers_data = self._parse_formdata_offers(request)
        if offers_data is not None and hasattr(request, 'data'):
            # The serializer's to_internal_value will handle the parsing
            # We just need to ensure the offers are available in a format it can parse
            # The serializer already handles FormData format, so we don't need to convert here
            pass  # Let the serializer handle it via to_internal_value
        
        return super().create(request, *args, **kwargs)

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminOrClient]
        else:
            permission_classes = [IsAdminOrReadOnly]
        return [permission() for permission in permission_classes]

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        product = self.get_object()
        
        # Filter offers by approval status
        if not request.user.is_authenticated:
            offers = product.offers.filter(approval_status='approved')
        elif not request.user.is_admin:
            offers = product.offers.filter(
                Q(approval_status='approved') |
                Q(approval_status='pending', created_by=request.user)
            )
        else:
            offers = product.offers.all()
        
        response.data['offers'] = PriceOfferSerializer(offers.order_by('price'), many=True, context={'request': request}).data
        
        similar_products = Product.objects.filter(
            category=product.category,
            approval_status='approved'
        ).exclude(id=product.id)[:12]
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

    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrClient], parser_classes=[MultiPartParser, FormParser])
    def upload_csv(self, request):
        """
        Upload products from CSV or Excel file.
        Expected format:
        name,description,brand,category,image,price,merchant,url,tags
        """
        if 'file' not in request.FILES:
            return Response({'detail': 'Aucun fichier fourni.'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']
        file_ext = file.name.lower().split('.')[-1]
        
        if file_ext not in ['csv', 'xlsx', 'xls']:
            return Response(
                {'detail': 'Le fichier doit être un CSV ou Excel (.xlsx, .xls).'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            results = {
                'success': 0,
                'errors': [],
                'pending': 0,
                'approved': 0
            }

            user = request.user
            rows = []

            if file_ext == 'csv':
                # Read CSV file
                decoded_file = file.read().decode('utf-8')
                io_string = io.StringIO(decoded_file)
                reader = csv.DictReader(io_string)
                rows = list(reader)
            elif file_ext in ['xlsx', 'xls']:
                if not EXCEL_SUPPORT:
                    return Response(
                        {'detail': 'Support Excel non disponible. Installez openpyxl: pip install openpyxl'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Read Excel file
                workbook = openpyxl.load_workbook(file)
                sheet = workbook.active
                
                # Get headers from first row
                headers = [cell.value for cell in sheet[1]]
                
                # Read data rows
                for row in sheet.iter_rows(min_row=2, values_only=False):
                    row_dict = {}
                    for idx, cell in enumerate(row):
                        if idx < len(headers) and headers[idx]:
                            row_dict[headers[idx]] = str(cell.value) if cell.value is not None else ''
                    if any(row_dict.values()):  # Skip empty rows
                        rows.append(row_dict)

            # Process each row
            for row_num, row in enumerate(rows, start=2):  # Start at 2 (1 is header)
                try:
                    # Extract data
                    name = row.get('name', '').strip()
                    if not name:
                        results['errors'].append(f'Ligne {row_num}: Le nom est requis')
                        continue

                    # Get or create category
                    category = None
                    category_name = row.get('category', '').strip()
                    if category_name:
                        category, _ = Category.objects.get_or_create(
                            name=category_name,
                            defaults={'slug': None}
                        )

                    # Create product
                    product_data = {
                        'name': name,
                        'description': row.get('description', '').strip(),
                        'brand': row.get('brand', '').strip(),
                        'image': row.get('image', '').strip(),
                        'category_id': category.id if category else None,
                    }

                    # Handle tags (comma-separated)
                    tags_str = row.get('tags', '').strip()
                    if tags_str:
                        product_data['tags'] = [tag.strip() for tag in tags_str.split(',') if tag.strip()]

                    # Create product with serializer to handle approval logic
                    serializer = ProductCreateUpdateSerializer(
                        data=product_data,
                        context={'request': request}
                    )

                    if serializer.is_valid():
                        product = serializer.save()
                        results['success'] += 1
                        if product.approval_status == 'approved':
                            results['approved'] += 1
                        else:
                            results['pending'] += 1

                        # Create price offer if price and merchant provided
                        price_str = row.get('price', '').strip()
                        merchant_name = row.get('merchant', '').strip()
                        url = row.get('url', '').strip()

                        if price_str and merchant_name:
                            try:
                                # Parse price (remove currency symbols, handle commas)
                                price_clean = price_str.replace('DH', '').replace('MAD', '').replace(',', '').strip()
                                price = Decimal(price_clean)

                                merchant, _ = Merchant.objects.get_or_create(name=merchant_name)

                                PriceOffer.objects.get_or_create(
                                    product=product,
                                    merchant=merchant,
                                    defaults={
                                        'price': price,
                                        'currency': 'MAD',
                                        'url': url,
                                    }
                                )
                            except (ValueError, InvalidOperation):
                                results['errors'].append(f'Ligne {row_num}: Prix invalide: {price_str}')
                    else:
                        results['errors'].append(f'Ligne {row_num}: {serializer.errors}')

                except Exception as e:
                    results['errors'].append(f'Ligne {row_num}: {str(e)}')

            return Response({
                'message': f'Import terminé: {results["success"]} produits créés',
                'success': results['success'],
                'approved': results['approved'],
                'pending': results['pending'],
                'errors': results['errors'][:10],  # Limit errors to first 10
                'total_errors': len(results['errors'])
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'detail': f'Erreur lors de la lecture du fichier: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], permission_classes=[CanApproveProduct])
    def approve(self, request, slug=None):
        """
        Admin endpoint to approve or reject a product.
        Expected payload: {'action': 'approve' or 'reject', 'rejection_reason': '...'}
        """
        product = self.get_object()
        action_type = request.data.get('action', '').lower()

        if action_type == 'approve':
            product.approval_status = 'approved'
            product.approved_by = request.user
            product.approved_at = timezone.now()
            product.rejection_reason = ''
            product.save()
            return Response({
                'message': 'Produit approuvé avec succès',
                'product': ProductDetailSerializer(product).data
            }, status=status.HTTP_200_OK)

        elif action_type == 'reject':
            rejection_reason = request.data.get('rejection_reason', '')
            product.approval_status = 'rejected'
            product.approved_by = request.user
            product.approved_at = timezone.now()
            product.rejection_reason = rejection_reason
            product.save()
            return Response({
                'message': 'Produit rejeté',
                'product': ProductDetailSerializer(product).data
            }, status=status.HTTP_200_OK)

        else:
            return Response(
                {'detail': "L'action doit être 'approve' ou 'reject'"},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], permission_classes=[CanApproveProduct])
    def pending(self, request):
        """
        Get all pending products (admin only).
        """
        queryset = Product.objects.filter(approval_status='pending').select_related(
            'category', 'created_by'
        ).order_by('-created_at')
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ProductDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ProductDetailSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrClient])
    def my_products(self, request):
        """
        Get all products created by the current user.
        """
        queryset = Product.objects.filter(created_by=request.user).select_related(
            'category', 'created_by', 'approved_by'
        ).prefetch_related('offers__merchant').annotate(lowest_price=Min('offers__price')).order_by('-created_at')
        
        # Filter by approval status if provided
        approval_status = request.query_params.get('approval_status')
        if approval_status:
            queryset = queryset.filter(approval_status=approval_status)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ProductDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ProductDetailSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def with_description(self, request):
        """
        Get products that have descriptions.
        Optional query parameter: min_length (default: 50) - minimum description length in characters.
        """
        from django.db.models.functions import Length
        
        # Get minimum description length from query params (default: 50)
        try:
            min_length = int(request.query_params.get('min_length', 50))
        except (ValueError, TypeError):
            min_length = 50
        
        queryset = self.filter_queryset(
            self.get_queryset().annotate(
                desc_length=Length('description')
            ).filter(
                desc_length__gte=min_length
            ).exclude(description='')
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
        """
        Get all products created by the current user.
        """
        queryset = Product.objects.filter(created_by=request.user).select_related(
            'category', 'created_by', 'approved_by'
        ).prefetch_related('offers__merchant').annotate(lowest_price=Min('offers__price')).order_by('-created_at')
        
        # Filter by approval status if provided
        approval_status = request.query_params.get('approval_status')
        if approval_status:
            queryset = queryset.filter(approval_status=approval_status)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ProductDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ProductDetailSerializer(queryset, many=True)
        return Response(serializer.data)


class PriceOfferViewSet(viewsets.ModelViewSet):
    queryset = PriceOffer.objects.select_related('product', 'product__category', 'merchant', 'created_by', 'approved_by')
    serializer_class = PriceOfferSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['price', 'date_updated']
    permission_classes = [IsAdminOrReadOnly]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by approval status
        if not self.request.user.is_authenticated:
            queryset = queryset.filter(approval_status='approved')
        elif not self.request.user.is_admin:
            # Regular users see approved offers and their own pending offers
            queryset = queryset.filter(
                Q(approval_status='approved') |
                Q(approval_status='pending', created_by=self.request.user)
            )
        
        # Filter by product if provided
        product_slug = self.request.query_params.get('product')
        if product_slug:
            queryset = queryset.filter(product__slug=product_slug)
        
        return queryset
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def submit(self, request):
        """Allow logged-in users to submit new price offers"""
        from .serializers import PriceOfferSubmitSerializer
        from django.utils import timezone
        
        serializer = PriceOfferSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        product_slug = request.data.get('product_slug')
        
        if not product_slug:
            return Response({'detail': 'product_slug is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            product = Product.objects.get(slug=product_slug)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get or create merchant
        merchant = None
        if data.get('merchant_id'):
            try:
                merchant = Merchant.objects.get(id=data['merchant_id'])
            except Merchant.DoesNotExist:
                return Response({'detail': 'Merchant not found'}, status=status.HTTP_404_NOT_FOUND)
        elif data.get('merchant_name'):
            merchant_name = data['merchant_name'].strip()
            if merchant_name:
                merchant, created = Merchant.objects.get_or_create(
                    name=merchant_name,
                    defaults={'website': data.get('url', '')}
                )
        
        if not merchant:
            return Response({'detail': 'Merchant is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if offer already exists
        existing_offer = PriceOffer.objects.filter(product=product, merchant=merchant).first()
        
        if existing_offer:
            # Update existing offer but set to pending if not admin
            if request.user.is_admin:
                existing_offer.approval_status = 'approved'
                existing_offer.approved_by = request.user
                existing_offer.approved_at = timezone.now()
            else:
                existing_offer.approval_status = 'pending'
                existing_offer.approved_by = None
                existing_offer.approved_at = None
            
            existing_offer.price = data['price']
            existing_offer.url = data.get('url', '')
            existing_offer.stock_status = data.get('stock_status', 'in_stock')
            existing_offer.currency = data.get('currency', 'MAD')
            existing_offer.created_by = request.user
            existing_offer.merchant_name = data.get('merchant_name', '')
            existing_offer.save()
            
            offer_serializer = PriceOfferSerializer(existing_offer, context={'request': request})
            return Response(offer_serializer.data, status=status.HTTP_200_OK)
        else:
            # Create new offer
            offer = PriceOffer.objects.create(
                product=product,
                merchant=merchant,
                price=data['price'],
                url=data.get('url', ''),
                stock_status=data.get('stock_status', 'in_stock'),
                currency=data.get('currency', 'MAD'),
                created_by=request.user,
                merchant_name=data.get('merchant_name', ''),
                approval_status='approved' if request.user.is_admin else 'pending',
                approved_by=request.user if request.user.is_admin else None,
                approved_at=timezone.now() if request.user.is_admin else None
            )
            
            offer_serializer = PriceOfferSerializer(offer, context={'request': request})
            return Response(offer_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        """Approve a pending offer (admin only)"""
        from django.utils import timezone
        
        offer = self.get_object()
        
        if offer.approval_status != 'pending':
            return Response(
                {'detail': 'Only pending offers can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        offer.approval_status = 'approved'
        offer.approved_by = request.user
        offer.approved_at = timezone.now()
        offer.rejection_reason = ''
        offer.save()
        
        serializer = self.get_serializer(offer)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        """Reject a pending offer (admin only)"""
        offer = self.get_object()
        
        if offer.approval_status != 'pending':
            return Response(
                {'detail': 'Only pending offers can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rejection_reason = request.data.get('rejection_reason', '')
        offer.approval_status = 'rejected'
        offer.rejection_reason = rejection_reason
        offer.save()
        
        serializer = self.get_serializer(offer)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def pending(self, request):
        """Get all pending offers (admin only)"""
        pending_offers = PriceOffer.objects.filter(approval_status='pending').select_related(
            'product', 'merchant', 'created_by'
        ).order_by('-date_updated')
        
        page = self.paginate_queryset(pending_offers)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(pending_offers, many=True)
        return Response(serializer.data)


class PromotionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Promotion.objects.prefetch_related('products__offers__merchant')
    serializer_class = PromotionSerializer


class PopularProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PopularProduct.objects.select_related('product', 'product__category')
    serializer_class = PopularProductSerializer

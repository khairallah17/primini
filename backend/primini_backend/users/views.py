from dj_rest_auth.views import UserDetailsView
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Count, Q

from .models import User
from .serializers import (
    UserSerializer, UserListSerializer, UserDetailSerializer,
    PasswordResetRequestSerializer, PasswordResetVerifyOTPSerializer,
    PasswordResetSerializer
)
from .permissions import IsAdmin
from primini_backend.pagination import CustomPageNumberPagination


class CustomUserDetailsView(UserDetailsView):
    """
    Custom view that explicitly uses our UserSerializer.
    This ensures the serializer is always used, even if dj-rest-auth
    doesn't pick it up from settings.
    """
    serializer_class = UserSerializer


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for admin user management.
    Allows admins to list users, view user details, and activate/deactivate accounts.
    """
    queryset = User.objects.all().annotate(
        products_count=Count('created_products')
    ).order_by('-date_joined')
    permission_classes = [IsAdmin]
    pagination_class = CustomPageNumberPagination
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserDetailSerializer
        return UserListSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Only return non-admin users (clients)
        queryset = queryset.exclude(role='admin')
        
        # Filter by active status if provided
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
        
        # Search by email, username, first_name, last_name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a user account."""
        user = self.get_object()
        # Prevent activating/deactivating admin users
        if user.role == 'admin':
            return Response(
                {'detail': 'Impossible de modifier le statut d\'un administrateur.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.is_active = True
        user.save()
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a user account."""
        user = self.get_object()
        # Prevent deactivating admin users or superusers
        if user.role == 'admin' or user.is_superuser:
            return Response(
                {'detail': 'Impossible de désactiver un administrateur ou un super utilisateur.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.is_active = False
        user.save()
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], pagination_class=CustomPageNumberPagination)
    def products(self, request, pk=None):
        """Get all products created by a specific user."""
        user = self.get_object()
        from primini_backend.products.serializers import ProductDetailSerializer
        from primini_backend.products.models import Product
        
        products = Product.objects.filter(created_by=user).select_related(
            'category', 'created_by', 'approved_by'
        ).prefetch_related('offers__merchant').order_by('-created_at')
        
        # Filter by approval status if provided
        approval_status = request.query_params.get('approval_status')
        if approval_status:
            products = products.filter(approval_status=approval_status)
        
        # Search by product name or brand
        search = request.query_params.get('search')
        if search:
            products = products.filter(
                Q(name__icontains=search) | Q(brand__icontains=search)
            )
        
        # Pagination
        paginator = CustomPageNumberPagination()
        page = paginator.paginate_queryset(products, request)
        if page is not None:
            serializer = ProductDetailSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = ProductDetailSerializer(products, many=True)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    """Request password reset OTP."""
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
        try:
            result = serializer.save()
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_verify_otp(request):
    """Verify OTP and return reset token."""
    serializer = PasswordResetVerifyOTPSerializer(data=request.data)
    if serializer.is_valid():
        return Response({
            'reset_token': serializer.validated_data['reset_token'],
            'message': 'Code de vérification validé. Vous pouvez maintenant réinitialiser votre mot de passe.'
        }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset(request):
    """Reset password using reset token."""
    serializer = PasswordResetSerializer(data=request.data)
    if serializer.is_valid():
        try:
            result = serializer.save()
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


from django.contrib import admin
from django.urls import include, path
from rest_framework import routers

from primini_backend.products import views as product_views
from primini_backend.alerts import views as alert_views
from primini_backend.pages import views as page_views

router = routers.DefaultRouter()
router.register(r'categories', product_views.CategoryViewSet, basename='category')
router.register(r'products', product_views.ProductViewSet, basename='product')
router.register(r'merchants', product_views.MerchantViewSet, basename='merchant')
router.register(r'offers', product_views.PriceOfferViewSet, basename='offer')
router.register(r'promotions', product_views.PromotionViewSet, basename='promotion')
router.register(r'popular-products', product_views.PopularProductViewSet, basename='popular-product')
router.register(r'alerts', alert_views.AlertViewSet, basename='alert')
router.register(r'pages', page_views.PageViewSet, basename='page')
router.register(r'faqs', page_views.FaqEntryViewSet, basename='faq')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
]

'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import api from '../../lib/apiClient';
import { getAdSenseConfig, type AdSenseConfig } from '../../lib/settingsApi';
import { submitOffer, getMerchants, type OfferSubmitData } from '../../lib/productApi';
import { getCategoryProducts, type ProductSummary } from '../../lib/categoryApi';
import type { PriceOffer, Product, Category, Merchant } from '../../lib/types';
import Carousel from '../Carousel';
import ProductCard from '../ProductCard';
import AdSense from '../AdSense';
import Image from 'next/image';
import ProductImageGallery from '../ProductImageGallery';
import ProductDetailSkeleton from '../ProductDetailSkeleton';

function formatCurrency(value: number | string | undefined) {
  if (value === undefined || value === null) return 'N/A';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return 'N/A';
  return `${numValue.toFixed(3)} MAD`;
}

function formatDate(dateString: string | undefined) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateString;
  }
}

type ProductDetailScreenProps = {
  slug: string;
};

export default function ProductDetailScreen({ slug }: ProductDetailScreenProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [adsenseConfig, setAdsenseConfig] = useState<AdSenseConfig | null>(null);
  const [offersExpanded, setOffersExpanded] = useState(false);
  const [showOnlyInStock, setShowOnlyInStock] = useState(false);
  const [activeTab, setActiveTab] = useState<'price' | 'info'>('price');
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [merchants, setMerchants] = useState<Array<{ id: number; name: string }>>([]);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [offerMessage, setOfferMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [offerFormData, setOfferFormData] = useState<OfferSubmitData>({
    product_slug: slug,
    price: 0,
    stock_status: 'in_stock',
    currency: 'MAD',
  });
  const [similarProducts, setSimilarProducts] = useState<ProductSummary[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [imageLoadStatus, setImageLoadStatus] = useState<Record<number, boolean>>({});
  const tabsRef = useRef<HTMLDivElement>(null);
  const { addFavorite, isFavorite, removeFavorite } = useFavorites();
  const { tokens, user, isAdmin } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const response = await api.get<Product>(`/products/${slug}/`);
        setProduct(response.data);
      } catch (error) {
        console.warn('Failed to load product', error);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [slug]);

  useEffect(() => {
    async function loadAdSenseConfig() {
      try {
        const config = await getAdSenseConfig();
        setAdsenseConfig(config);
      } catch (error) {
        console.warn('Failed to load AdSense config', error);
      }
    }
    void loadAdSenseConfig();
  }, []);

  useEffect(() => {
    async function loadMerchants() {
      try {
        const merchantsData = await getMerchants();
        setMerchants(merchantsData);
      } catch (error) {
        console.warn('Failed to load merchants', error);
      }
    }
    void loadMerchants();
  }, []);

  // Load similar products from the same subcategory
  useEffect(() => {
    async function loadSimilarProducts() {
      if (!product) return;
      
      // Use parent category slug for API call, filter by subcategory if available
      const categorySlug = product.category?.slug;
      if (!categorySlug) return;

      setLoadingSimilar(true);
      try {
        const params: { subcategory?: string; page_size?: number } = {
          page_size: 20, // Get more to account for filtering out current product
        };
        
        // If product has a subcategory, filter by that subcategory
        if (product.subcategory?.slug) {
          params.subcategory = product.subcategory.slug;
        }
        
        const response = await getCategoryProducts(categorySlug, params);
        
        // Filter out the current product and limit to 12
        const filtered = response.results
          .filter((p) => p.id !== product.id)
          .slice(0, 12);
        
        setSimilarProducts(filtered);
      } catch (error) {
        console.warn('Failed to load similar products', error);
        setSimilarProducts([]);
      } finally {
        setLoadingSimilar(false);
      }
    }
    void loadSimilarProducts();
  }, [product]);

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokens?.key || !user) {
      setOfferMessage({ type: 'error', text: 'Vous devez être connecté pour soumettre une offre' });
      return;
    }

    if (!offerFormData.merchant_id && !offerFormData.merchant_name?.trim()) {
      setOfferMessage({ type: 'error', text: 'Veuillez sélectionner ou saisir un nom de marchand' });
      return;
    }

    if (offerFormData.price <= 0) {
      setOfferMessage({ type: 'error', text: 'Le prix doit être supérieur à 0' });
      return;
    }

    setSubmittingOffer(true);
    setOfferMessage(null);

    try {
      await submitOffer(offerFormData, tokens.key);
      setOfferMessage({ type: 'success', text: 'Offre soumise avec succès! Elle sera examinée par un administrateur avant d\'être publiée.' });
      setOfferFormData({
        product_slug: slug,
        price: 0,
        stock_status: 'in_stock',
        currency: 'MAD',
      });
      setShowOfferForm(false);
      
      // Reload product to show the new offer
      const response = await api.get<Product>(`/products/${slug}/`);
      setProduct(response.data);
    } catch (error: any) {
      setOfferMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erreur lors de la soumission de l\'offre'
      });
    } finally {
      setSubmittingOffer(false);
    }
  };

  const offers = useMemo(() => {
    const allOffers = product?.offers ?? [];
    if (showOnlyInStock) {
      return allOffers.filter(offer => offer.stock_status === 'in_stock');
    }
    return allOffers;
  }, [product?.offers, showOnlyInStock]);

  const lowestPrice = offers.length > 0 ? Math.min(...offers.map((offer) => Number(offer.price))) : undefined;
  const highestPrice = offers.length > 0 ? Math.max(...offers.map((offer) => Number(offer.price))) : undefined;
  const favoriteActive = product ? isFavorite(product.id) : false;
  const MAX_VISIBLE_OFFERS = 5;
  const shouldCollapse = offers.length > MAX_VISIBLE_OFFERS;
  const visibleOffers = shouldCollapse && !offersExpanded 
    ? offers.slice(0, MAX_VISIBLE_OFFERS) 
    : offers;
  
  // Check if user can edit this product
  const canEdit = product && user && (
    isAdmin || 
    (product.created_by_email === user.email && product.approval_status !== 'approved')
  );

  // Build breadcrumb path
  const breadcrumbs = useMemo(() => {
    if (!product?.category) return [];
    const crumbs: Array<{ name: string; slug?: string }> = [
      { name: 'Start', slug: '/' }
    ];
    
    // Note: parent is an ID, not a Category object
    // For now, we'll just show the category itself
    crumbs.push({ name: product.category.name, slug: `/categories/${product.category.slug}` });
    
    return crumbs;
  }, [product?.category]);

  const toggleFavorite = () => {
    if (!product) return;
    if (favoriteActive) {
      removeFavorite(product.id);
    } else {
      addFavorite({
        id: product.id,
        name: product.name,
        slug: product.slug,
        image: product.image,
        lowestPrice
      });
    }
  };

  const handleLearnMore = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveTab('info');
    // Scroll to tabs section
    setTimeout(() => {
      tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return <p className="text-center text-sm text-slate-500">Produit introuvable.</p>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-slate-600 overflow-x-auto">
        {breadcrumbs.map((crumb, index) => (
          <span key={index} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {index > 0 && <span>/</span>}
            {crumb.slug ? (
              <Link href={crumb.slug} className="hover:text-primary transition-colors whitespace-nowrap">
                {crumb.name}
              </Link>
            ) : (
              <span className="whitespace-nowrap">{crumb.name}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Product Header */}
      <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 break-words">
              {product.name}
            </h1>
            {product.brand && (
              <p className="mt-2 text-base sm:text-lg text-slate-600">{product.brand}</p>
                  )}
                </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={toggleFavorite}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                favoriteActive 
                  ? 'bg-secondary text-white hover:bg-secondary/90' 
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {favoriteActive ? 'Retirer' : 'Ajouter'}
            </button>
                {canEdit && (
                  <Link
                    href={`/products/${product.slug}/edit`}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Modifier
                  </Link>
                )}
          </div>
        </div>
      </div>

      {/* Images and Description Section */}
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr,1.2fr] lg:items-start min-w-0" style={{ width: '100%', maxWidth: '100%' }}>
        {/* Left Column - Image Gallery */}
        <div className="w-full order-1 min-w-0" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
          <ProductImageGallery
            images={
              product.images && product.images.length > 0
                ? product.images
                    .sort((a, b) => a.order - b.order)
                    .map((img) => img.image_url || img.image)
                : product.image_display
                ? [product.image_display]
                : product.image
                ? [product.image]
                : []
            }
            productName={product.name}
          />
        </div>

        {/* Right Column - Description */}
        <div className="flex flex-col order-2">
          {product.description && (
            <div className="prose prose-sm max-w-none flex flex-col">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-3">Description</h2>
              <div className="text-slate-700 leading-relaxed overflow-hidden relative max-h-[250px] sm:max-h-[350px] md:max-h-[400px] lg:max-h-[450px]">
                <div className="overflow-y-auto pr-2 h-full">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="ml-2">{children}</li>,
                      h1: ({ children }) => <h1 className="text-2xl font-bold text-slate-900 mb-3 mt-4">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-semibold text-slate-900 mb-2 mt-4">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-semibold text-slate-900 mb-2 mt-3">{children}</h3>,
                      code: ({ children }) => <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 border-slate-300 pl-4 italic my-4">{children}</blockquote>,
                    }}
                  >
                    {product.description}
                  </ReactMarkdown>
                </div>
                {/* Gradient overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
              </div>
              <button
                onClick={handleLearnMore}
                className="mt-4 text-sm font-medium text-primary hover:text-primary-dark transition-colors self-start"
              >
                En savoir plus →
              </button>
            </div>
          )}

          {/* Price Range */}
          {lowestPrice && highestPrice && (
            <div className="text-base sm:text-lg font-semibold text-slate-900 mt-4">
              {lowestPrice === highestPrice ? (
                <span>{formatCurrency(lowestPrice)}</span>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span>
                  De {formatCurrency(lowestPrice)} à {formatCurrency(highestPrice)}
                  </span>
                  {lowestPrice < highestPrice && (
                    <span className="text-secondary text-sm sm:text-base">
                      (Économisez {formatCurrency(highestPrice - lowestPrice)})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div ref={tabsRef} className="border-b border-slate-200">
        <nav className="flex gap-4 sm:gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('price')}
            className={`pb-3 px-2 sm:px-1 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === 'price'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Prix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-2 sm:px-1 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === 'info'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Info produit
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'price' && (
          <div className="space-y-4">
              {/* Filter Checkbox */}
              <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyInStock}
                  onChange={(e) => setShowOnlyInStock(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary flex-shrink-0"
                />
                <span className="break-words">Afficher seulement les offres disponibles en stock</span>
              </label>

              {/* Offers List */}
              {offers.length > 0 ? (
                <div className="space-y-4">
                  {visibleOffers.map((offer: PriceOffer) => (
                    <div
                      key={offer.id}
                      className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                    >
                      {/* Top Row - Chevron and Merchant Logo */}
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
                        {/* Chevron Icon */}
                        <button className="text-slate-900 hover:text-slate-700 transition-colors flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {/* Merchant Logo */}
                        {offer.merchant?.logo_display || offer.merchant?.logo ? (
                          <Image
                            src={(offer.merchant.logo_display || offer.merchant.logo) ?? ''}
                            alt={offer.merchant.name || 'Merchant logo'}
                            width={120}
                            height={40}
                            className="h-8 sm:h-10 w-auto object-contain max-w-[120px] sm:max-w-[150px] flex-shrink-0"
                            unoptimized
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="h-8 sm:h-10 px-3 flex items-center bg-slate-100 rounded flex-shrink-0">
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap">
                              {offer.merchant?.name || 'Merchant'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Row - Product Name, Status, Price, Button */}
                      <div className="flex items-center justify-between gap-2 sm:gap-4 overflow-hidden">
                        {/* Left: Product Name and Stock Status */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
                          {/* Product Name */}
                          <h3 className="text-xs sm:text-sm md:text-base font-semibold text-primary hover:text-primary/90 line-clamp-1 flex-shrink-0 w-[60px] sm:w-auto">
                            {product.name}
                          </h3>
                          
                          {/* Stock Status with Icon */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {offer.stock_status === 'in_stock' ? (
                              <>
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-medium text-green-600 whitespace-nowrap hidden sm:inline">En stock</span>
                              </>
                            ) : offer.stock_status === 'low_stock' ? (
                              <>
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-medium text-yellow-600 whitespace-nowrap hidden sm:inline">Stock faible</span>
                              </>
                            ) : offer.stock_status === 'preorder' ? (
                              <>
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                                  <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-medium text-green-600 whitespace-nowrap hidden sm:inline">Précommande</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-medium text-red-600 whitespace-nowrap hidden sm:inline">Hors stock</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Middle: Price and Date (stacked vertically) */}
                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className="font-bold text-base sm:text-xl md:text-2xl text-slate-900 whitespace-nowrap">
                            {formatCurrency(offer.price)}
                          </span>
                          {offer.date_updated && (
                            <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                              {formatDate(offer.date_updated)}*
                            </span>
                          )}
                        </div>

                        {/* Right: CTA Button */}
                        <div className="flex-shrink-0">
                          <a
                            href={offer.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 sm:gap-1.5 px-4 sm:px-6 py-2 sm:py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base font-semibold rounded-lg transition-colors whitespace-nowrap"
                          >
                            <span className="hidden sm:inline">Voir l&apos;offre</span>
                            <span className="sm:hidden">Voir</span>
                            <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </a>
                        </div>
                      </div>
                      
                      {/* Date Note */}
                      {offer.date_updated && (
                        <p className="text-xs text-slate-500 mt-2">
                          *Date de la dernière mise à jour du prix
                        </p>
                      )}
                    </div>
                    ))}

                {shouldCollapse && (
                  <button
                    onClick={() => setOffersExpanded(!offersExpanded)}
                      className="w-full py-2 text-xs sm:text-sm text-primary hover:underline break-words"
                    type="button"
                  >
                    {offersExpanded 
                      ? `Afficher moins (${offers.length - MAX_VISIBLE_OFFERS} offres cachées)`
                      : `Afficher toutes les offres (${offers.length - MAX_VISIBLE_OFFERS} de plus)`
                    }
                  </button>
                )}

                  <p className="text-xs text-slate-500 mt-4 break-words">
                    Avis aux utilisateurs : Nous référençons régulièrement de nouvelles offres pour vous proposer le plus grand choix, néanmoins les résultats affichés ne reflètent pas l&apos;intégralité des offres disponibles sur le marché. Par défaut, les offres sont classées par prix ; l&apos;offre la moins chère apparaît en première position.
                  </p>
                </div>
              ) : (
                <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center">
                  <p className="text-slate-500">
                    {showOnlyInStock 
                      ? 'Aucune offre en stock disponible pour le moment.'
                      : 'Aucune offre disponible pour le moment.'
                    }
                  </p>
                </div>
              )}

              {/* Add Offer Form (for logged-in users) */}
              {user && (
                <div className="border-t border-slate-200 pt-6 mt-6">
                  {!showOfferForm ? (
                    <button
                      type="button"
                      onClick={() => setShowOfferForm(true)}
                      className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                      Ajouter une offre
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900">Ajouter une offre</h3>
                      
                      {offerMessage && (
                        <div className={`rounded-md p-4 ${
                          offerMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                        }`}>
                          {offerMessage.text}
                        </div>
                      )}

                      <form onSubmit={handleSubmitOffer} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Marchand
                          </label>
                          <select
                            value={offerFormData.merchant_id || ''}
                            onChange={(e) => {
                              const merchantId = e.target.value ? parseInt(e.target.value) : undefined;
                              setOfferFormData(prev => ({
                                ...prev,
                                merchant_id: merchantId,
                                merchant_name: merchantId ? undefined : prev.merchant_name
                              }));
                            }}
                            className="w-full rounded-md border-slate-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                          >
                            <option value="">Sélectionner un marchand existant</option>
                            {merchants.map((merchant) => (
                              <option key={merchant.id} value={merchant.id}>
                                {merchant.name}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-slate-500">ou</p>
                          <input
                            type="text"
                            value={offerFormData.merchant_name || ''}
                            onChange={(e) => setOfferFormData(prev => ({
                              ...prev,
                              merchant_name: e.target.value,
                              merchant_id: e.target.value ? undefined : prev.merchant_id
                            }))}
                            placeholder="Nom du nouveau marchand"
                            className="mt-1 w-full rounded-md border-slate-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                            disabled={!!offerFormData.merchant_id}
                          />
          </div>

              <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Prix (MAD) *
                          </label>
                <input
                  type="number"
                  step="0.01"
                            min="0"
                            value={offerFormData.price || ''}
                            onChange={(e) => setOfferFormData(prev => ({
                              ...prev,
                              price: parseFloat(e.target.value) || 0
                            }))}
                            required
                            className="w-full rounded-md border-slate-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Lien du produit (optionnel)
                          </label>
                          <input
                            type="url"
                            value={offerFormData.url || ''}
                            onChange={(e) => setOfferFormData(prev => ({
                              ...prev,
                              url: e.target.value
                            }))}
                            placeholder="https://example.com/product"
                            className="w-full rounded-md border-slate-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Statut du stock
                          </label>
                          <select
                            value={offerFormData.stock_status}
                            onChange={(e) => setOfferFormData(prev => ({
                              ...prev,
                              stock_status: e.target.value as 'in_stock' | 'low_stock' | 'out_of_stock'
                            }))}
                            className="w-full rounded-md border-slate-300 px-3 py-2 shadow-sm focus:border-primary focus:ring-primary"
                          >
                            <option value="in_stock">En stock</option>
                            <option value="low_stock">Stock faible</option>
                            <option value="out_of_stock">Rupture de stock</option>
                          </select>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="submit"
                            disabled={submittingOffer}
                            className="flex-1 rounded-md bg-primary px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                          >
                            {submittingOffer ? 'Envoi...' : 'Soumettre l\'offre'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowOfferForm(false);
                              setOfferMessage(null);
                              setOfferFormData({
                                product_slug: slug,
                                price: 0,
                                stock_status: 'in_stock',
                                currency: 'MAD',
                              });
                            }}
                            className="rounded-md border border-slate-300 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Annuler
                          </button>
                        </div>

                        <p className="text-xs text-slate-500">
                          * Votre offre sera examinée par un administrateur avant d&apos;être publiée.
                        </p>
                      </form>
                    </div>
                  )}
                </div>
                )}
              </div>
        )}

        {activeTab === 'info' && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Information produit</h2>
              
              {product.description && (
                <div className="text-slate-700 leading-relaxed">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="ml-2">{children}</li>,
                      h1: ({ children }) => <h1 className="text-2xl font-bold text-slate-900 mb-3 mt-4">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-semibold text-slate-900 mb-2 mt-4">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-semibold text-slate-900 mb-2 mt-3">{children}</h3>,
                      code: ({ children }) => <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 border-slate-300 pl-4 italic my-4">{children}</blockquote>,
                    }}
                  >
                    {product.description}
                  </ReactMarkdown>
                </div>
              )}

              {Object.keys(product.specs || {}).length > 0 && (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 break-words">
                    {product.category?.name} {product.brand} Maroc
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-slate-200 gap-1 sm:gap-0">
                      <dt className="font-medium text-slate-700 text-sm sm:text-base">Produit</dt>
                      <dd className="text-slate-900 font-semibold text-sm sm:text-base">Nom</dd>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-slate-200 gap-1 sm:gap-0">
                      <dt className="font-medium text-slate-700 text-sm sm:text-base">Nom</dt>
                      <dd className="text-slate-900 font-semibold text-sm sm:text-base break-words">{product.name}</dd>
                    </div>
                    {product.category && (
                      <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-slate-200 gap-1 sm:gap-0">
                        <dt className="font-medium text-slate-700 text-sm sm:text-base">Catégorie</dt>
                        <dd className="text-slate-900 font-semibold text-sm sm:text-base">
                          <Link href={`/categories/${product.category.slug}`} className="hover:text-primary break-words">
                            {product.category.name}
                          </Link>
                        </dd>
                      </div>
                    )}
                    {product.brand && (
                      <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-slate-200 gap-1 sm:gap-0">
                        <dt className="font-medium text-slate-700 text-sm sm:text-base">Marque</dt>
                        <dd className="text-slate-900 font-semibold text-sm sm:text-base break-words">{product.brand}</dd>
                      </div>
                    )}
                    {Object.entries(product.specs || {}).map(([key, value]) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-slate-200 gap-1 sm:gap-0">
                        <dt className="font-medium text-slate-700 text-sm sm:text-base break-words">{key}</dt>
                        <dd className="text-slate-900 font-semibold text-sm sm:text-base break-words text-right sm:text-left">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">Produits similaires</h2>
          {loadingSimilar ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="min-w-[250px] sm:min-w-[280px] h-96 animate-pulse rounded-3xl bg-slate-200" />
              ))}
            </div>
          ) : (
          <Carousel>
              {similarProducts.map((item) => {
                return (
                  <div 
                    key={item.id} 
                    className={`min-w-[250px] sm:min-w-[280px] snap-start`}
                  >
                    <ProductCard
                      product={{
                        id: item.id,
                        name: item.name,
                        slug: item.slug,
                        image: item.image,
                        image_display: item.image_display,
                        image_file: item.image_file,
                        lowestPrice: item.lowestPrice ?? item.lowest_price
                      }}
                      onImageLoadStatus={(isLoaded) => {
                        setImageLoadStatus(prev => ({
                          ...prev,
                          [item.id]: isLoaded
                        }));
                      }}
                    />
                  </div>
                );
              })}
          </Carousel>
          )}
        </section>
      )}

      <div className="flex justify-center">
        <AdSense slot="product_detail_bottom" className="my-8" />
      </div>
    </div>
  );
}

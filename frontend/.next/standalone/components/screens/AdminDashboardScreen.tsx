'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  getPendingProducts,
  getAllProducts,
  getMyProducts,
  approveProduct,
  rejectProduct,
  getPendingOffers,
  approveOffer,
  rejectOffer
} from '../../lib/productApi';
import type { Product, PaginatedResponse, PriceOffer } from '../../lib/types';
import Link from 'next/link';

type TabType = 'pending' | 'all' | 'my';

function AdminDashboardContent() {
  const router = useRouter();
  const { tokens } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<Product> | null>(null);
  const [pendingOffers, setPendingOffers] = useState<PriceOffer[]>([]);
  const [offersPagination, setOffersPagination] = useState<PaginatedResponse<PriceOffer> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [processingOffer, setProcessingOffer] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
  const [offerRejectionReason, setOfferRejectionReason] = useState<Record<number, string>>({});
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
  const [showOfferRejectForm, setShowOfferRejectForm] = useState<number | null>(null);
  
  // Filters for "All Products" tab
  const [approvalFilter, setApprovalFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!tokens?.key) return;
    loadProducts();
    if (activeTab === 'pending') {
      loadPendingOffers();
    }
  }, [tokens, activeTab, approvalFilter]);

  // Separate effect for search query with debounce
  useEffect(() => {
    if (activeTab !== 'all') return;
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (tokens?.key) {
        loadProducts(1);
      }
    }, 500);
    
    setSearchTimeout(timeout);
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery]);

  const loadProducts = async (page: number = 1) => {
    if (!tokens?.key) return;

    setLoading(true);
    setError(null);
    try {
      let data: PaginatedResponse<Product>;
      
      if (activeTab === 'pending') {
        data = await getPendingProducts(tokens.key, page);
      } else if (activeTab === 'all') {
        data = await getAllProducts(
          tokens.key,
          page,
          approvalFilter || undefined,
          searchQuery || undefined
        );
      } else {
        // my products
        data = await getMyProducts(tokens.key, page, approvalFilter || undefined);
      }
      
      setProducts(data.results);
      setPagination(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingOffers = async (page: number = 1) => {
    if (!tokens?.key) return;

    try {
      const data = await getPendingOffers(tokens.key, page);
      setPendingOffers(data.results);
      setOffersPagination(data);
    } catch (err: any) {
      console.error('Error loading pending offers:', err);
    }
  };

  const handleApproveOffer = async (offerId: number) => {
    if (!tokens?.key) return;

    setProcessingOffer(offerId);
    try {
      await approveOffer(offerId, tokens.key);
      await loadPendingOffers(offersPagination?.current_page || 1);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Erreur lors de l\'approbation');
    } finally {
      setProcessingOffer(null);
    }
  };

  const handleRejectOffer = async (offerId: number) => {
    if (!tokens?.key) return;

    const reason = offerRejectionReason[offerId] || '';
    if (!reason.trim()) {
      setError('Veuillez fournir une raison de rejet');
      return;
    }

    setProcessingOffer(offerId);
    try {
      await rejectOffer(offerId, reason, tokens.key);
      setShowOfferRejectForm(null);
      setOfferRejectionReason({ ...offerRejectionReason, [offerId]: '' });
      await loadPendingOffers(offersPagination?.current_page || 1);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Erreur lors du rejet');
    } finally {
      setProcessingOffer(null);
    }
  };

  const handleApprove = async (slug: string) => {
    if (!tokens?.key) return;

    setProcessing(slug);
    try {
      await approveProduct(slug, tokens.key);
      await loadProducts(pagination?.current_page || 1);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Erreur lors de l\'approbation');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (slug: string) => {
    if (!tokens?.key) return;

    const reason = rejectionReason[slug] || '';
    if (!reason.trim()) {
      setError('Veuillez fournir une raison de rejet');
      return;
    }

    setProcessing(slug);
    try {
      await rejectProduct(slug, reason, tokens.key);
      setShowRejectForm(null);
      setRejectionReason({ ...rejectionReason, [slug]: '' });
      await loadProducts(pagination?.current_page || 1);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Erreur lors du rejet');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const handleImageError = (productId: number) => {
    setImageErrors(prev => ({ ...prev, [productId]: true }));
  };

  const getImageUrl = (product: Product): string | null => {
    // Prefer image_display if available (from backend)
    if (product.image_display) {
      return product.image_display;
    }
    
    // If image_file is available, construct the URL
    if (product.image_file) {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL 
        ? process.env.NEXT_PUBLIC_API_BASE_URL.replace('/api', '')
        : 'http://localhost:8000';
      const imagePath = product.image_file.startsWith('/') ? product.image_file : `/${product.image_file}`;
      return `${baseUrl}${imagePath}`;
    }
    
    // Fallback to image field
    if (!product.image) return null;
    
    // If it's already a full URL (http/https), use it directly
    if (product.image.startsWith('http://') || product.image.startsWith('https://')) {
      return product.image;
    }
    
    // If it's a local path (starts with /media/ or media/), prepend backend URL
    if (product.image.startsWith('/media/') || product.image.startsWith('media/')) {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL 
        ? process.env.NEXT_PUBLIC_API_BASE_URL.replace('/api', '')
        : 'http://localhost:8000';
      const imagePath = product.image.startsWith('/') ? product.image : `/${product.image}`;
      return `${baseUrl}${imagePath}`;
    }
    
    // If it's a relative path without /media/, assume it's in media/products/
    if (!product.image.includes('://')) {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL 
        ? process.env.NEXT_PUBLIC_API_BASE_URL.replace('/api', '')
        : 'http://localhost:8000';
      const imagePath = product.image.startsWith('/') ? product.image : `/media/products/${product.image}`;
      return `${baseUrl}${imagePath}`;
    }
    
    return product.image;
  };

  const renderProductRow = (product: Product) => {
    const imageUrl = getImageUrl(product);
    
    return (
    <tr key={product.id}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {imageUrl && !imageErrors[product.id] ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="h-12 w-12 rounded object-cover mr-4"
              onError={() => handleImageError(product.id)}
            />
          ) : (
            <div className="h-12 w-12 rounded bg-gray-200 mr-4 flex items-center justify-center">
              <span className="text-xs text-gray-400">N/A</span>
            </div>
          )}
            <div>
              {product.slug ? (
                <Link
                  href={`/product/${product.slug}`}
                  className="text-sm font-medium text-gray-900 hover:text-primary"
                >
                  {product.name}
                </Link>
              ) : (
                <span className="text-sm font-medium text-gray-900">{product.name}</span>
              )}
              {product.brand && (
                <p className="text-sm text-gray-500">{product.brand}</p>
              )}
            </div>
        </div>
      </td>
      {activeTab === 'all' && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {getStatusBadge(product.approval_status)}
        </td>
      )}
      {activeTab !== 'my' && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {product.created_by_email || 'admin'}
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {product.created_at
          ? new Date(product.created_at).toLocaleDateString('fr-FR')
          : 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end gap-2">
          {activeTab === 'pending' ? (
            showRejectForm === product.slug ? (
              <div className="flex-1 space-y-2">
                <textarea
                  placeholder="Raison du rejet..."
                  value={rejectionReason[product.slug] || ''}
                  onChange={(e) =>
                    setRejectionReason({
                      ...rejectionReason,
                      [product.slug]: e.target.value
                    })
                  }
                  className="w-full rounded-md border-gray-300 text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReject(product.slug)}
                    disabled={processing === product.slug}
                    className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {processing === product.slug ? '...' : 'Confirmer'}
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectForm(null);
                      setRejectionReason({ ...rejectionReason, [product.slug]: '' });
                    }}
                    className="rounded-md bg-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleApprove(product.slug)}
                  disabled={processing === product.slug}
                  className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {processing === product.slug ? '...' : 'Approuver'}
                </button>
                <button
                  onClick={() => setShowRejectForm(product.slug)}
                  disabled={processing === product.slug}
                  className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Rejeter
                </button>
              </>
            )
          ) : (
            <>
              {/* Edit button - admins can edit any product */}
              {product.slug ? (
                <Link
                  href={`/products/${product.slug}/edit`}
                  className="rounded-md bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                >
                  Modifier
                </Link>
              ) : (
                <span className="text-xs text-gray-400">N/A</span>
              )}
              {/* Approve/Reject buttons for pending products in "all" tab */}
              {activeTab === 'all' && product.approval_status === 'pending' && (
                showRejectForm === product.slug ? (
                  <div className="flex-1 space-y-2">
                    <textarea
                      placeholder="Raison du rejet..."
                      value={rejectionReason[product.slug] || ''}
                      onChange={(e) =>
                        setRejectionReason({
                          ...rejectionReason,
                          [product.slug]: e.target.value
                        })
                      }
                      className="w-full rounded-md border-gray-300 text-sm"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(product.slug)}
                        disabled={processing === product.slug}
                        className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {processing === product.slug ? '...' : 'Confirmer'}
                      </button>
                      <button
                        onClick={() => {
                          setShowRejectForm(null);
                          setRejectionReason({ ...rejectionReason, [product.slug]: '' });
                        }}
                        className="rounded-md bg-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-300"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleApprove(product.slug)}
                      disabled={processing === product.slug}
                      className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {processing === product.slug ? '...' : 'Approuver'}
                    </button>
                    <button
                      onClick={() => setShowRejectForm(product.slug)}
                      disabled={processing === product.slug}
                      className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Rejeter
                    </button>
                  </>
                )
              )}
            </>
          )}
        </div>
      </td>
    </tr>
    );
  };

  if (loading && !products.length) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  return (
      <div className="h-full w-full bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tableau de bord Admin</h1>
            <p className="mt-2 text-sm text-gray-500">Gérez les produits, utilisateurs et paramètres</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setActiveTab('pending');
                setApprovalFilter('');
                setSearchQuery('');
              }}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === 'pending'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              En attente
              {activeTab === 'pending' && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                  {(pagination?.count || 0) + (offersPagination?.count || 0)}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('all');
                setApprovalFilter('');
                setSearchQuery('');
              }}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === 'all'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Tous les produits
            </button>
            <button
              onClick={() => {
                setActiveTab('my');
                setApprovalFilter('');
                setSearchQuery('');
              }}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === 'my'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Mes produits
            </button>
          </nav>
        </div>

        {/* Filters for "All Products" tab */}
        {activeTab === 'all' && (
          <div className="mb-6 flex gap-4 rounded-md bg-white p-4 shadow">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <select
              value={approvalFilter}
              onChange={(e) => {
                setApprovalFilter(e.target.value);
                loadProducts(1);
              }}
              className="rounded-md border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Rejeté</option>
            </select>
          </div>
        )}

        {/* Filter for "My Products" tab */}
        {activeTab === 'my' && (
          <div className="mb-6">
            <select
              value={approvalFilter}
              onChange={(e) => {
                setApprovalFilter(e.target.value);
                loadProducts(1);
              }}
              className="rounded-md border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Rejeté</option>
            </select>
          </div>
        )}

        {/* Info banner for pending tab */}
        {activeTab === 'pending' && (
          <div className="mb-6 rounded-md bg-blue-50 p-4 text-blue-800">
            <p className="font-semibold">Éléments en attente d&apos;approbation</p>
            <p className="mt-1 text-sm">
              {pagination?.count || 0} produit(s) et {offersPagination?.count || 0} offre(s) en attente
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">{error}</div>
        )}

        {activeTab === 'pending' && (
          <>
            {/* Pending Products Section */}
            {products.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Produits en attente</h2>
                <div className="overflow-hidden bg-white shadow rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Produit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Créé par
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Date
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {products.map(renderProductRow)}
                      </tbody>
                    </table>
                  </div>
                  {pagination && pagination.total_pages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
                      <div className="text-sm text-gray-700">
                        Page {pagination.current_page} sur {pagination.total_pages} ({pagination.count} produit(s))
                      </div>
                      <div className="flex gap-2">
                        {pagination.previous_page && (
                          <button
                            onClick={() => loadProducts(pagination.previous_page!)}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Précédent
                          </button>
                        )}
                        {pagination.next_page && (
                          <button
                            onClick={() => loadProducts(pagination.next_page!)}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Suivant
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pending Offers Section */}
            {pendingOffers.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Offres en attente</h2>
                <div className="overflow-hidden bg-white shadow rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Produit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Marchand
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Prix
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Stock
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Créé par
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Date
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {pendingOffers.map((offer) => (
                          <tr key={offer.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {offer.product?.slug ? (
                                  <Link
                                    href={`/product/${offer.product.slug}`}
                                    className="hover:text-primary"
                                  >
                                    {offer.product.name}
                                  </Link>
                                ) : (
                                  offer.product?.name || 'N/A'
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {offer.merchant?.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {typeof offer.price === 'number' 
                                ? offer.price.toFixed(2) 
                                : parseFloat(String(offer.price || 0)).toFixed(2)} {offer.currency || 'MAD'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                offer.stock_status === 'in_stock' ? 'bg-green-100 text-green-800' :
                                offer.stock_status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {offer.stock_status === 'in_stock' ? 'En stock' :
                                 offer.stock_status === 'out_of_stock' ? 'Rupture' :
                                 'Stock faible'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {offer.created_by_email || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {offer.date_updated
                                ? new Date(offer.date_updated).toLocaleDateString('fr-FR')
                                : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {showOfferRejectForm === offer.id ? (
                                <div className="flex flex-col gap-2 items-end">
                                  <textarea
                                    placeholder="Raison du rejet..."
                                    value={offerRejectionReason[offer.id] || ''}
                                    onChange={(e) =>
                                      setOfferRejectionReason({
                                        ...offerRejectionReason,
                                        [offer.id]: e.target.value
                                      })
                                    }
                                    className="w-full rounded-md border-gray-300 text-sm"
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleRejectOffer(offer.id)}
                                      disabled={processingOffer === offer.id}
                                      className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                                    >
                                      {processingOffer === offer.id ? '...' : 'Confirmer'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowOfferRejectForm(null);
                                        setOfferRejectionReason({ ...offerRejectionReason, [offer.id]: '' });
                                      }}
                                      className="rounded-md bg-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-300"
                                    >
                                      Annuler
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => handleApproveOffer(offer.id)}
                                    disabled={processingOffer === offer.id}
                                    className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {processingOffer === offer.id ? '...' : 'Approuver'}
                                  </button>
                                  <button
                                    onClick={() => setShowOfferRejectForm(offer.id)}
                                    disabled={processingOffer === offer.id}
                                    className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                                  >
                                    Rejeter
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {offersPagination && offersPagination.total_pages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
                      <div className="text-sm text-gray-700">
                        Page {offersPagination.current_page} sur {offersPagination.total_pages} ({offersPagination.count} offre(s))
                      </div>
                      <div className="flex gap-2">
                        {offersPagination.previous_page && (
                          <button
                            onClick={() => loadPendingOffers(offersPagination.previous_page!)}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Précédent
                          </button>
                        )}
                        {offersPagination.next_page && (
                          <button
                            onClick={() => loadPendingOffers(offersPagination.next_page!)}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Suivant
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty state for pending tab */}
            {products.length === 0 && pendingOffers.length === 0 && !loading && (
              <div className="bg-white p-12 text-center shadow rounded-lg">
                <p className="text-lg text-gray-500">
                  Aucun élément en attente d&apos;approbation
                </p>
              </div>
            )}
          </>
        )}

        {/* Other tabs (all, my) */}
        {activeTab !== 'pending' && (
          <>
            {products.length === 0 ? (
              <div className="bg-white p-12 text-center shadow rounded-lg">
                <p className="text-lg text-gray-500">
                  {activeTab === 'all'
                    ? 'Aucun produit trouvé'
                    : 'Aucun produit créé'}
                </p>
              </div>
            ) : (
          <div className="overflow-hidden bg-white shadow rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Produit
                    </th>
                    {activeTab === 'all' && (
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Statut
                      </th>
                    )}
                    {activeTab !== 'my' && (
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Créé par
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {products.map(renderProductRow)}
                </tbody>
              </table>
            </div>

            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
                <div className="text-sm text-gray-700">
                  Page {pagination.current_page} sur {pagination.total_pages} ({pagination.count}{' '}
                  produit(s) au total)
                </div>
                <div className="flex gap-2">
                  {pagination.previous_page && (
                    <button
                      onClick={() => loadProducts(pagination.previous_page!)}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Précédent
                    </button>
                  )}
                  {pagination.next_page && (
                    <button
                      onClick={() => loadProducts(pagination.next_page!)}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Suivant
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboardScreen() {
  return <AdminDashboardContent />;
}

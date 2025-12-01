'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../ProtectedRoute';
import { uploadProductsCSV, getMyProducts } from '../../lib/productApi';
import type { Product, PaginatedResponse } from '../../lib/types';

function ClientDashboardContent() {
  const { tokens } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<Product> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    message: string;
    success: number;
    approved: number;
    pending: number;
    errors: string[];
  } | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!tokens?.key) return;
    loadMyProducts();
  }, [tokens, filter]);

  const loadMyProducts = async (page: number = 1) => {
    if (!tokens?.key) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getMyProducts(
        tokens.key,
        page,
        filter !== 'all' ? filter : undefined
      );
      setProducts(data.results);
      setPagination(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tokens?.key) return;

    const fileExt = file.name.toLowerCase().split('.').pop();
    if (!['csv', 'xlsx', 'xls'].includes(fileExt || '')) {
      setError('Le fichier doit être un CSV ou Excel (.xlsx, .xls)');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const result = await uploadProductsCSV(file, tokens.key);
      setUploadResult(result);
      // Reload products after upload
      await loadMyProducts(pagination?.current_page || 1);
      // Reset file input
      e.target.value = '';
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const stats = {
    total: pagination?.count || 0,
    pending: products.filter(p => p.approval_status === 'pending').length,
    approved: products.filter(p => p.approval_status === 'approved').length,
    rejected: products.filter(p => p.approval_status === 'rejected').length,
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Mon Tableau de bord</h1>
          <div className="flex gap-3">
            <Link
              href="/products/create"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              + Créer un produit
            </Link>
            <label className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {uploading ? 'Upload...' : 'Importer CSV/Excel'}
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-white p-4 shadow">
            <p className="text-sm text-gray-600">Total produits</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <p className="text-sm text-gray-600">En attente</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <p className="text-sm text-gray-600">Approuvés</p>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <p className="text-sm text-gray-600">Rejetés</p>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </div>
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <div className="font-semibold text-green-800 mb-2">{uploadResult.message}</div>
            <div className="text-sm text-green-700 space-y-1">
              <p>✓ Produits créés: {uploadResult.success}</p>
              <p>✓ Approuvés: {uploadResult.approved}</p>
              <p>⏳ En attente: {uploadResult.pending}</p>
              {uploadResult.errors.length > 0 && (
                <p className="text-red-600">✗ Erreurs: {uploadResult.errors.length}</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Tous ({stats.total})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            En attente ({stats.pending})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              filter === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Approuvés ({stats.approved})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              filter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Rejetés ({stats.rejected})
          </button>
        </div>

        {/* Products List */}
        {products.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">Aucun produit trouvé</p>
            <Link
              href="/products/create"
              className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Créer votre premier produit
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.image && !imageErrors[product.id] ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-12 w-12 rounded object-cover mr-4"
                              onError={() => setImageErrors(prev => ({ ...prev, [product.id]: true }))}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded bg-gray-200 mr-4 flex items-center justify-center">
                              <span className="text-xs text-gray-400">N/A</span>
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/product/${product.slug}`}
                              className="text-sm font-medium text-gray-900 hover:text-primary"
                            >
                              {product.name}
                            </Link>
                            {product.brand && (
                              <p className="text-sm text-gray-500">{product.brand}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(product.approval_status || 'pending')}`}>
                          {getStatusLabel(product.approval_status || 'pending')}
                        </span>
                        {product.approval_status === 'rejected' && product.rejection_reason && (
                          <p className="mt-1 text-xs text-red-600">{product.rejection_reason}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.created_at
                          ? new Date(product.created_at).toLocaleDateString('fr-FR')
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/products/${product.slug}/edit`}
                          className="text-primary hover:text-primary/80"
                        >
                          Modifier
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.total_pages > 1 && (
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Page {pagination.current_page} sur {pagination.total_pages}
                </div>
                <div className="flex gap-2">
                  {pagination.previous_page && (
                    <button
                      onClick={() => loadMyProducts(pagination.previous_page!)}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Précédent
                    </button>
                  )}
                  {pagination.next_page && (
                    <button
                      onClick={() => loadMyProducts(pagination.next_page!)}
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
      </div>
    </div>
  );
}

export default function ClientDashboardScreen() {
  return (
    <ProtectedRoute requireAuth requireClient>
      <ClientDashboardContent />
    </ProtectedRoute>
  );
}

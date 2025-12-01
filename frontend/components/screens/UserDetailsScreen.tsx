'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  getUserDetails,
  activateUser,
  deactivateUser,
  getUserProducts,
  type User
} from '../../lib/userApi';
import type { PaginatedResponse } from '../../lib/types';
import type { Product } from '../../lib/types';
import Link from 'next/link';

function UserDetailsContent() {
  const router = useRouter();
  const params = useParams();
  const { tokens } = useAuth();
  const userId = params?.id ? parseInt(params.id as string) : null;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<Product> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Filters
  const [approvalFilter, setApprovalFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!tokens?.key || !userId) return;
    loadUserDetails();
    loadUserProducts();
  }, [tokens, userId, approvalFilter]);

  // Separate effect for search query with debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (tokens?.key && userId) {
        loadUserProducts(1);
      }
    }, 500);
    
    setSearchTimeout(timeout);
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery]);

  const loadUserDetails = async () => {
    if (!tokens?.key || !userId) return;

    setLoading(true);
    setError(null);
    try {
      const userData = await getUserDetails(userId, tokens.key);
      setUser(userData);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadUserProducts = async (page: number = 1) => {
    if (!tokens?.key || !userId) return;

    try {
      const productsData = await getUserProducts(
        userId,
        tokens.key,
        page,
        approvalFilter || undefined,
        searchQuery || undefined
      );
      setProducts(productsData.results);
      setPagination(productsData);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Erreur lors du chargement des produits');
    }
  };

  const handleToggleActive = async () => {
    if (!tokens?.key || !user) return;

    setProcessing(true);
    try {
      if (user.is_active) {
        await deactivateUser(user.id, tokens.key);
      } else {
        await activateUser(user.id, tokens.key);
      }
      await loadUserDetails();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Erreur lors de la modification');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${
          isActive
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {isActive ? 'Actif' : 'Inactif'}
      </span>
    );
  };

  const getApprovalStatusBadge = (status?: string) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg text-red-600">Utilisateur non trouvé</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-primary hover:text-primary/80"
          >
            ← Retour à la liste des utilisateurs
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user.first_name || user.last_name
                  ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                  : user.username || user.email}
              </h1>
              <p className="mt-1 text-sm text-gray-600">{user.email}</p>
            </div>
            <div className="flex items-center gap-4">
              {getStatusBadge(user.is_active)}
              <button
                onClick={handleToggleActive}
                disabled={processing || user.is_superuser}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                  user.is_active
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {processing
                  ? '...'
                  : user.is_active
                  ? 'Désactiver'
                  : 'Activer'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">{error}</div>
        )}

        {/* User Information Card */}
        <div className="mb-6 overflow-hidden bg-white shadow rounded-lg">
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations utilisateur</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
              {user.username && (
                <div>
                  <p className="text-sm text-gray-600">Nom d'utilisateur</p>
                  <p className="text-sm font-medium">@{user.username}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Prénom</p>
                <p className="text-sm font-medium">{user.first_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Nom</p>
                <p className="text-sm font-medium">{user.last_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Rôle</p>
                <p className="text-sm font-medium">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    Client
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Statut</p>
                <p className="text-sm font-medium">{getStatusBadge(user.is_active)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date d'inscription</p>
                <p className="text-sm font-medium">
                  {new Date(user.date_joined).toLocaleString('fr-FR')}
                </p>
              </div>
              {user.last_login && (
                <div>
                  <p className="text-sm text-gray-600">Dernière connexion</p>
                  <p className="text-sm font-medium">
                    {new Date(user.last_login).toLocaleString('fr-FR')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="overflow-hidden bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Produits créés ({pagination?.count || 0})
              </h2>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex gap-4">
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
                  loadUserProducts(1);
                }}
                className="rounded-md border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvé</option>
                <option value="rejected">Rejeté</option>
              </select>
            </div>
          </div>

          {/* Products Table */}
          {products.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">Aucun produit trouvé</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Produit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Statut d'approbation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Date de création
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getApprovalStatusBadge(product.approval_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.created_at
                            ? new Date(product.created_at).toLocaleDateString('fr-FR')
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {product.slug ? (
                            <Link
                              href={`/product/${product.slug}`}
                              className="text-primary hover:text-primary/80"
                            >
                              Voir
                            </Link>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination && pagination.total_pages > 1 && (
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                  <div className="text-sm text-gray-700">
                    Page {pagination.current_page} sur {pagination.total_pages} (
                    {pagination.count} produit(s) au total)
                  </div>
                  <div className="flex gap-2">
                    {pagination.previous_page && (
                      <button
                        onClick={() => loadUserProducts(pagination.previous_page!)}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Précédent
                      </button>
                    )}
                    {pagination.next_page && (
                      <button
                        onClick={() => loadUserProducts(pagination.next_page!)}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Suivant
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UserDetailsScreen() {
  return <UserDetailsContent />;
}


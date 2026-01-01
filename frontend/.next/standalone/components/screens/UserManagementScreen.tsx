'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getAllUsers,
  activateUser,
  deactivateUser,
  type User
} from '../../lib/userApi';
import type { PaginatedResponse } from '../../lib/types';
import Link from 'next/link';

function UserManagementContent() {
  const { tokens } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<User> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  
  // Filters
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!tokens?.key) return;
    loadUsers();
  }, [tokens, activeFilter]);

  // Separate effect for search query with debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (tokens?.key) {
        loadUsers(1);
      }
    }, 500);
    
    setSearchTimeout(timeout);
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery]);

  const loadUsers = async (page: number = 1) => {
    if (!tokens?.key) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getAllUsers(
        tokens.key,
        page,
        undefined, // role filter removed - API only returns clients
        activeFilter ? activeFilter === 'true' : undefined,
        searchQuery || undefined
      );
      setUsers(data.results);
      setPagination(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };


  const handleToggleActive = async (user: User) => {
    if (!tokens?.key) return;

    setProcessing(user.id);
    try {
      if (user.is_active) {
        await deactivateUser(user.id, tokens.key);
      } else {
        await activateUser(user.id, tokens.key);
      }
      await loadUsers(pagination?.current_page || 1);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Erreur lors de la modification');
    } finally {
      setProcessing(null);
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


  if (loading && !users.length) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gérez les comptes utilisateurs, activez/désactivez les comptes et consultez l&apos;historique des produits.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 rounded-md bg-white p-4 shadow">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Rechercher par email, nom d'utilisateur, prénom, nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              loadUsers(1);
            }}
            className="rounded-md border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="true">Actif</option>
            <option value="false">Inactif</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">{error}</div>
        )}

        {users.length === 0 ? (
          <div className="bg-white p-12 text-center shadow rounded-lg">
            <p className="text-lg text-gray-500">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="overflow-hidden bg-white shadow rounded-lg">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {user.first_name || user.last_name
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                              : user.username || user.email}
                          </h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.username && (
                            <p className="text-xs text-gray-400">@{user.username}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Client
                          </span>
                          {getStatusBadge(user.is_active)}
                        </div>
                      </div>
                      <div className="mt-2 flex gap-4 text-sm text-gray-600">
                        <span>
                          <strong>{user.products_count || 0}</strong> produit(s) créé(s)
                        </span>
                        <span>
                          Inscrit le {new Date(user.date_joined).toLocaleDateString('fr-FR')}
                        </span>
                        {user.last_login && (
                          <span>
                            Dernière connexion: {new Date(user.last_login).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Détails
                      </Link>
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={processing === user.id || user.is_superuser}
                        className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                          user.is_active
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-green-600 hover:bg-green-700'
                        } disabled:opacity-50`}
                      >
                        {processing === user.id
                          ? '...'
                          : user.is_active
                          ? 'Désactiver'
                          : 'Activer'}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

        {pagination && pagination.total_pages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-6 py-4 rounded-lg shadow">
            <div className="text-sm text-gray-700">
              Page {pagination.current_page} sur {pagination.total_pages} ({pagination.count}{' '}
              utilisateur(s) au total)
            </div>
            <div className="flex gap-2">
              {pagination.previous_page && (
                <button
                  onClick={() => loadUsers(pagination.previous_page!)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Précédent
                </button>
              )}
              {pagination.next_page && (
                <button
                  onClick={() => loadUsers(pagination.next_page!)}
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
  );
}

export default function UserManagementScreen() {
  return <UserManagementContent />;
}


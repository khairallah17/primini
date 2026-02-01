'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/apiClient';
import { BlogPost, PaginatedResponse } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';

export default function BlogManagementScreen() {
  const router = useRouter();
  const { tokens } = useAuth();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    current_page: number;
    total_pages: number;
  } | null>(null);

  useEffect(() => {
    async function loadBlogs() {
      try {
        setLoading(true);
        const headers = tokens ? { Authorization: `Token ${tokens.key}` } : {};
        const response = await api.get<PaginatedResponse<BlogPost>>('/blogs/', {
          headers,
        });
        setBlogs(response.data.results || []);
        setPagination({
          current_page: response.data.current_page || 1,
          total_pages: response.data.total_pages || 1,
        });
      } catch (err) {
        console.error('Failed to load blogs', err);
        setError('Impossible de charger les articles de blog.');
      } finally {
        setLoading(false);
      }
    }
    void loadBlogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; tokens used inside
  }, []);

  const handleDelete = async (id: number, slug: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'article "${slug}" ?`)) {
      return;
    }

    try {
      const headers = tokens ? { Authorization: `Token ${tokens.key}` } : {};
      await api.delete(`/blogs/${slug}/`, {
        headers,
      });
      setBlogs(blogs.filter((blog) => blog.id !== id));
    } catch (err) {
      console.error('Failed to delete blog', err);
      alert('Impossible de supprimer l\'article.');
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      published: { label: 'Publié', className: 'bg-green-100 text-green-800' },
      draft: { label: 'Brouillon', className: 'bg-yellow-100 text-yellow-800' },
      archived: { label: 'Archivé', className: 'bg-gray-100 text-gray-800' },
    };
    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-slate-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion du Blog</h1>
            <p className="mt-2 text-sm text-gray-500">Créez et gérez les articles de blog</p>
          </div>
          <Link
            href="/admin/blogs/create"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            + Nouvel article
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {blogs.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <p className="text-gray-600">Aucun article de blog pour le moment.</p>
            <Link
              href="/admin/blogs/create"
              className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              Créer le premier article
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Titre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Auteur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date de publication
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {blogs.map((blog) => (
                  <tr key={blog.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{blog.title}</div>
                      <div className="text-xs text-gray-500">/{blog.slug}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getStatusBadge(blog.status)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {blog.author_name || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(blog.published_at || blog.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <Link
                        href={`/admin/blogs/${blog.slug}/edit`}
                        className="text-primary hover:text-primary-dark mr-4"
                      >
                        Modifier
                      </Link>
                      <button
                        onClick={() => handleDelete(blog.id, blog.slug)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.total_pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-sm text-gray-600">
              Page {pagination.current_page} sur {pagination.total_pages}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}


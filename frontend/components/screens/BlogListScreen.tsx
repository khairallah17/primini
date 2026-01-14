'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '../../lib/apiClient';
import { BlogPost, PaginatedResponse } from '../../lib/types';

export default function BlogListScreen() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    current_page: number;
    total_pages: number;
    next_page: number | null;
    previous_page: number | null;
  } | null>(null);

  useEffect(() => {
    async function loadBlogs() {
      try {
        setLoading(true);
        const response = await api.get<PaginatedResponse<BlogPost>>('/blogs/');
        setBlogs(response.data.results || []);
        setPagination({
          current_page: response.data.current_page || 1,
          total_pages: response.data.total_pages || 1,
          next_page: response.data.next_page,
          previous_page: response.data.previous_page,
        });
      } catch (err) {
        console.error('Failed to load blogs', err);
        setError('Impossible de charger les articles de blog.');
      } finally {
        setLoading(false);
      }
    }
    void loadBlogs();
  }, []);

  const loadPage = async (page: number) => {
    try {
      setLoading(true);
      const response = await api.get<PaginatedResponse<BlogPost>>(`/blogs/?page=${page}`);
      setBlogs(response.data.results || []);
      setPagination({
        current_page: response.data.current_page || 1,
        total_pages: response.data.total_pages || 1,
        next_page: response.data.next_page,
        previous_page: response.data.previous_page,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load blogs', err);
      setError('Impossible de charger les articles de blog.');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath: string | undefined): string | null => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const baseUrl = apiUrl.replace('/api', '');
    const imagePathClean = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${baseUrl}${imagePathClean}`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading && blogs.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-slate-600">Chargement des articles...</div>
      </div>
    );
  }

  if (error && blogs.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-slate-900">Blog</h1>
        <p className="text-slate-600">
          Découvrez nos articles et actualités
        </p>
      </div>

      {blogs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-slate-600">Aucun article de blog disponible pour le moment.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogs.map((blog) => {
              const imageUrl = getImageUrl(blog.featured_image_url_display || blog.featured_image_url || blog.featured_image);
              
              return (
                <Link
                  key={blog.id}
                  href={`/blog/${blog.slug}`}
                  className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  {imageUrl && (
                    <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                      <Image
                        src={imageUrl}
                        alt={blog.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-2 text-xs text-slate-500">
                      {formatDate(blog.published_at || blog.created_at)}
                      {blog.author_name && ` • ${blog.author_name}`}
                    </div>
                    <h2 className="mb-2 text-xl font-semibold text-slate-900 group-hover:text-blue-600">
                      {blog.title}
                    </h2>
                    {blog.excerpt && (
                      <p className="mt-auto line-clamp-3 text-sm text-slate-600">
                        {blog.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => pagination.previous_page && loadPage(pagination.previous_page)}
                disabled={!pagination.previous_page || loading}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Précédent
              </button>
              <span className="px-4 py-2 text-sm text-slate-600">
                Page {pagination.current_page} sur {pagination.total_pages}
              </span>
              <button
                onClick={() => pagination.next_page && loadPage(pagination.next_page)}
                disabled={!pagination.next_page || loading}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}


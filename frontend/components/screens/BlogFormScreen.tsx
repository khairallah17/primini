'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../lib/apiClient';
import { BlogPost } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import Image from 'next/image';

const blogSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  slug: z.string().min(1, 'Le slug est requis'),
  excerpt: z.string().optional(),
  content: z.string().min(1, 'Le contenu est requis'),
  featured_image_url: z.string().url().optional().or(z.literal('')),
  meta_title: z.string().max(70, 'Le meta titre doit faire moins de 70 caractères').optional(),
  meta_description: z.string().max(160, 'La meta description doit faire moins de 160 caractères').optional(),
  meta_keywords: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  published_at: z.string().optional(),
});

type BlogFormData = z.infer<typeof blogSchema>;

export default function BlogFormScreen() {
  const router = useRouter();
  const params = useParams();
  const { tokens } = useAuth();
  const slug = params?.slug as string | undefined;
  const isEdit = !!slug;
  const [loading, setLoading] = useState(false);
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<BlogFormData>({
    resolver: zodResolver(blogSchema),
    defaultValues: {
      status: 'draft',
      featured_image_url: '',
    },
  });

  const watchedImageUrl = watch('featured_image_url');

  useEffect(() => {
    if (isEdit && slug) {
      const loadBlog = async () => {
        try {
          const headers = tokens ? { Authorization: `Token ${tokens.key}` } : {};
          const response = await api.get<BlogPost>(`/blogs/${slug}/`, {
            headers,
          });
          const blogData = response.data;
          setBlog(blogData);
          
          // Set form values
          setValue('title', blogData.title);
          setValue('slug', blogData.slug);
          setValue('excerpt', blogData.excerpt || '');
          setValue('content', blogData.content);
          setValue('featured_image_url', blogData.featured_image_url || '');
          setValue('meta_title', blogData.meta_title || '');
          setValue('meta_description', blogData.meta_description || '');
          setValue('meta_keywords', blogData.meta_keywords || '');
          setValue('status', blogData.status);
          if (blogData.published_at) {
            const date = new Date(blogData.published_at);
            setValue('published_at', date.toISOString().slice(0, 16));
          }

          // Set image preview
          const imageUrl = blogData.featured_image_url_display || blogData.featured_image_url || blogData.featured_image;
          if (imageUrl) {
            setImagePreview(imageUrl);
          }
        } catch (err) {
          console.error('Failed to load blog', err);
          alert('Impossible de charger l\'article.');
          router.push('/admin/blogs');
        }
      }
      void loadBlog();
    }
  }, [isEdit, slug, setValue, router, tokens]);

  useEffect(() => {
    if (watchedImageUrl) {
      setImagePreview(watchedImageUrl);
      setImageError(false);
    } else if (blog?.featured_image_url_display) {
      setImagePreview(blog.featured_image_url_display);
    } else {
      setImagePreview(null);
    }
  }, [watchedImageUrl, blog]);

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

  const onSubmit = async (data: BlogFormData) => {
    try {
      setLoading(true);
      const headers = tokens ? { Authorization: `Token ${tokens.key}` } : {};
      
      const payload: any = {
        ...data,
        published_at: data.published_at || null,
      };

      if (isEdit && slug) {
        await api.patch(`/blogs/${slug}/`, payload, {
          headers,
        });
      } else {
        await api.post('/blogs/', payload, {
          headers,
        });
      }

      router.push('/admin/blogs');
    } catch (err: any) {
      console.error('Failed to save blog', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Impossible de sauvegarder l\'article.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Modifier l\'article' : 'Nouvel article'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {isEdit ? 'Modifiez les informations de l\'article' : 'Créez un nouvel article de blog'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Informations générales</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Titre *
                </label>
                <input
                  type="text"
                  id="title"
                  {...register('title')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                  Slug (URL) *
                </label>
                <input
                  type="text"
                  id="slug"
                  {...register('slug')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                />
                {errors.slug && (
                  <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700">
                  Extrait
                </label>
                <textarea
                  id="excerpt"
                  rows={3}
                  {...register('excerpt')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                  placeholder="Court résumé de l&apos;article..."
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  Contenu *
                </label>
                <textarea
                  id="content"
                  rows={15}
                  {...register('content')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                  placeholder="Contenu de l'article (HTML accepté)..."
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Image mise en avant</h2>
            
            <div>
              <label htmlFor="featured_image_url" className="block text-sm font-medium text-gray-700">
                URL de l&apos;image
              </label>
              <input
                type="url"
                id="featured_image_url"
                {...register('featured_image_url')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                placeholder="https://example.com/image.jpg"
              />
              {imagePreview && (
                <div className="mt-4">
                  <div className="relative h-64 w-full overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                      onError={() => setImageError(true)}
                    />
                  </div>
                </div>
              )}
              {imageError && (
                <p className="mt-1 text-sm text-red-600">Impossible de charger l&apos;image</p>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">SEO</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="meta_title" className="block text-sm font-medium text-gray-700">
                  Meta titre (max 70 caractères)
                </label>
                <input
                  type="text"
                  id="meta_title"
                  maxLength={70}
                  {...register('meta_title')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                />
                {errors.meta_title && (
                  <p className="mt-1 text-sm text-red-600">{errors.meta_title.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700">
                  Meta description (max 160 caractères)
                </label>
                <textarea
                  id="meta_description"
                  rows={3}
                  maxLength={160}
                  {...register('meta_description')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                />
                {errors.meta_description && (
                  <p className="mt-1 text-sm text-red-600">{errors.meta_description.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="meta_keywords" className="block text-sm font-medium text-gray-700">
                  Mots-clés (séparés par des virgules)
                </label>
                <input
                  type="text"
                  id="meta_keywords"
                  {...register('meta_keywords')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                  placeholder="mot-clé1, mot-clé2, mot-clé3"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Publication</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Statut
                </label>
                <select
                  id="status"
                  {...register('status')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                  <option value="archived">Archivé</option>
                </select>
              </div>

              <div>
                <label htmlFor="published_at" className="block text-sm font-medium text-gray-700">
                  Date de publication
                </label>
                <input
                  type="datetime-local"
                  id="published_at"
                  {...register('published_at')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Laissez vide pour utiliser la date actuelle lors de la publication
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/admin/blogs')}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {isSubmitting || loading ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


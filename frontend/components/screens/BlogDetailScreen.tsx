'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import api from '../../lib/apiClient';
import { BlogPost } from '../../lib/types';

type BlogDetailScreenProps = {
  slug: string;
};

export default function BlogDetailScreen({ slug }: BlogDetailScreenProps) {
  const router = useRouter();
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBlog() {
      try {
        setLoading(true);
        const response = await api.get<BlogPost>(`/blogs/${slug}/`);
        setBlog(response.data);
      } catch (err: any) {
        console.error('Failed to load blog', err);
        if (err.response?.status === 404) {
          setError('Article non trouvé.');
        } else {
          setError('Impossible de charger l\'article.');
        }
      } finally {
        setLoading(false);
      }
    }
    void loadBlog();
  }, [slug]);

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-slate-600">Chargement de l&apos;article...</div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4">
        <div className="text-lg text-red-600">{error || 'Article non trouvé.'}</div>
        <Link
          href="/blog"
          className="text-blue-600 hover:text-blue-800"
        >
          Retour au blog
        </Link>
      </div>
    );
  }

  const imageUrl = getImageUrl(blog.featured_image_url_display || blog.featured_image_url || blog.featured_image);

  return (
    <article className="space-y-8">
      <div className="space-y-4">
        <Link
          href="/blog"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          ← Retour au blog
        </Link>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-900 line-clamp-3">{blog.title}</h1>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>{formatDate(blog.published_at || blog.created_at)}</span>
            {blog.author_name && (
              <>
                <span>•</span>
                <span>{blog.author_name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {imageUrl && (
        <div className="relative h-96 w-full overflow-hidden rounded-lg bg-slate-100">
          <Image
            src={imageUrl}
            alt={blog.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
      )}

      {blog.excerpt && (
        <div className="rounded-lg bg-slate-50 p-6">
          <p className="text-lg text-slate-700 line-clamp-4">{blog.excerpt}</p>
        </div>
      )}

      <div
        className="prose prose-slate max-w-none break-words overflow-x-hidden leading-relaxed"
        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />

      <div className="border-t border-slate-200 pt-8">
        <Link
          href="/blog"
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          ← Retour au blog
        </Link>
      </div>
    </article>
  );
}


'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, FormEvent, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '../lib/apiClient';
import type { Category } from '../lib/types';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading, isAdmin, isClient, isUser, isVisitor } = useAuth();
  const { favorites, removeFavorite } = useFavorites();
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const favoritesRef = useRef<HTMLDivElement>(null);

  // Check if header should be hidden (after all hooks are called)
  const shouldHideHeader = pathname?.startsWith('/admin') || pathname === '/register' || pathname === '/login';

  const topNavLinks = [
    { href: '/deals', label: 'Bons plans' },
    { href: '/magic-tool', label: "L'outil magique" },
    { href: '/categories', label: 'Catégories' }
  ];

  // Fetch categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await api.get<{ results: Category[] }>('/categories/');
        // Filter to only show parent categories (top-level categories)
        const parentCategories = (response.data.results || []).filter((category) => !category.parent);
        setCategories(parentCategories);
      } catch (error) {
        console.warn('Failed to load categories', error);
      }
    }
    void loadCategories();
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  // Close favorites panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (favoritesRef.current && !favoritesRef.current.contains(event.target as Node)) {
        setFavoritesOpen(false);
      }
    }

    if (favoritesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [favoritesOpen]);

  // Hide header on admin pages and auth pages (after all hooks)
  if (shouldHideHeader) {
    return null;
  }

  return (
    <header className="bg-primary sticky top-0 z-50 shadow-lg">
      {/* Top Navigation Bar */}
      <div className="border-b border-primary-dark/30 bg-primary-dark/20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
          <nav className="hidden items-center gap-6 text-xs font-medium text-white/80 md:flex">
            {topNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            {/* Social Links */}
            <div className="hidden items-center gap-3 md:flex">
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://www.linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
            </div>
            
            <div className="flex items-center gap-4 text-xs">
              {loading ? (
                <span className="text-white/60">Chargement...</span>
              ) : user ? (
                // Only show dashboard link for admin or client, not for 'user' role
                (isAdmin || isClient) ? (
                  <Link
                    href={isAdmin ? '/admin' : '/dashboard'}
                    className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                  >
                    <span className="hidden sm:inline">
                      {isAdmin ? 'Mon Tableau de bord' : 'Mon Tableau de bord'}
                    </span>
                    <span className="sm:hidden">Compte</span>
                  </Link>
                ) : null
              ) : (
                <Link
                  href="/login"
                  className="text-white/90 hover:text-white transition-colors"
                >
                  Connexion
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="border-b border-primary-dark/30">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/images/avito-colors.jpeg"
              alt="Avita"
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/60 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <svg
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </form>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Ma sélection (Favorites) - for all users */}
            <div className="relative" ref={favoritesRef}>
              <button
                onClick={() => setFavoritesOpen(!favoritesOpen)}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-3 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                type="button"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="hidden sm:inline">Ma sélection</span>
                {favorites.length > 0 && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-white">
                    {favorites.length}
                  </span>
                )}
              </button>
              
              {/* Favorites Dropdown Panel */}
              {favoritesOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-white/20 bg-white p-5 shadow-2xl">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-primary">Produits favoris</h3>
                    <button 
                      onClick={() => setFavoritesOpen(false)} 
                      className="rounded-full bg-gray-100 p-1 hover:bg-gray-200" 
                      type="button"
                    >
                      <XMarkIcon className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                  {favorites.length === 0 ? (
                    <p className="text-sm text-gray-500">Ajoutez des produits pour les suivre facilement.</p>
                  ) : (
                    <ul className="space-y-3 max-h-96 overflow-y-auto">
                      {favorites.map((product) => (
                        <li key={product.id} className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <Link 
                              href={`/product/${product.slug}`} 
                              className="font-medium text-gray-800 hover:text-primary block truncate"
                              onClick={() => setFavoritesOpen(false)}
                            >
                              {product.name}
                            </Link>
                            {(product.lowestPrice ?? product.lowest_price) !== undefined && (
                              <p className="text-xs text-gray-500">
                                à partir de {(product.lowestPrice ?? product.lowest_price)!.toFixed(2)} MAD
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeFavorite(product.id)}
                            className="flex-shrink-0 text-xs text-secondary hover:underline font-medium"
                            type="button"
                          >
                            Retirer
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* User Account */}
            {loading ? (
              <div className="h-10 w-10 animate-pulse rounded-full bg-white/20" />
            ) : user ? (
              <div className="flex items-center gap-3">
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-sm font-semibold transition-colors hover:bg-white/30"
                    title="Aller au tableau de bord admin"
                  >
                    {(user.first_name?.[0] || user.username?.[0] || user.email[0] || 'U').toUpperCase()}
                  </Link>
                ) : isClient ? (
                  <Link
                    href="/dashboard"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-sm font-semibold transition-colors hover:bg-white/30"
                  >
                    {(user.first_name?.[0] || user.username?.[0] || user.email[0] || 'U').toUpperCase()}
                  </Link>
                ) : (
                  // 'user' role - no dashboard access, just show avatar without link
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-sm font-semibold"
                    title="Compte utilisateur"
                  >
                    {(user.first_name?.[0] || user.username?.[0] || user.email[0] || 'U').toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-white">
                    {user.first_name && user.last_name
                      ? `${user.first_name} ${user.last_name}`
                      : user.username || 'Mon compte'}
                  </p>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-white/70 hover:text-white transition-colors"
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors sm:inline-block"
                >
                  Connexion
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 transition-colors shadow-lg"
                >
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="border-b border-primary-dark/30 bg-primary-dark/10">
        <div className="mx-auto max-w-7xl px-6">
          <nav className="flex items-center gap-6 overflow-x-auto py-3 scrollbar-hide">
            {/* Bons plans link */}
            <Link
              href="/deals"
              className={`whitespace-nowrap text-sm font-medium transition-colors ${
                pathname.startsWith('/deals')
                  ? 'text-white border-b-2 border-secondary pb-1'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Bons plans
            </Link>
            {/* Dynamic categories from API */}
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                className={`whitespace-nowrap text-sm font-medium transition-colors ${
                  pathname.startsWith(`/categories/${category.slug}`)
                    ? 'text-white border-b-2 border-secondary pb-1'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

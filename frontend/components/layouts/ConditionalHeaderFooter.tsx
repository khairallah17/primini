'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Header from '../Header';
import Footer from '../Footer';
import FavoriteBar from '../FavoriteBar';

type ConditionalHeaderFooterProps = {
  children: ReactNode;
};

/**
 * Conditional Header/Footer Component
 * Renders Header and Footer only for regular pages (not admin, auth, or forgot-password pages)
 * Admin pages have their own separate layout in /app/admin/layout.tsx
 */
export default function ConditionalHeaderFooter({ children }: ConditionalHeaderFooterProps) {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  
  // Admin pages have their own layout - completely skip Header/Footer
  const isAdminPage = pathname?.startsWith('/admin');
  
  // Auth pages (register, login)
  const isAuthPage = pathname === '/register' || pathname === '/login';
  
  // Forgot password pages
  const isForgotPasswordPage = pathname?.startsWith('/forgot-password');
  
  // Admin-accessible product pages (create, upload, edit) - these use admin layout
  const adminProductPages = ['/products/create', '/products/upload'];
  const isEditPage = pathname?.includes('/products/') && pathname?.includes('/edit');
  const isAdminProductPage = isAdmin && pathname && (adminProductPages.includes(pathname) || isEditPage);
  
  // Pages that should NOT have Header/Footer
  const shouldHideHeaderFooter = isAdminPage || isAuthPage || isForgotPasswordPage || isAdminProductPage;

  // For admin pages and special pages, render only the main content
  // (admin pages have their own layout wrapper that provides the sidebar)
  if (shouldHideHeaderFooter) {
    return <main className="flex-1">{children}</main>;
  }

  // Regular pages get Header, Footer, and FavoriteBar
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FavoriteBar />
    </>
  );
}


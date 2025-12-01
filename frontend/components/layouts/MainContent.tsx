'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

type MainContentProps = {
  children: ReactNode;
};

/**
 * MainContent Component
 * Applies width constraints to regular pages
 * Admin pages and special pages get full width (they have their own layouts)
 */
export default function MainContent({ children }: MainContentProps) {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  
  // Admin pages have their own layout - full width
  const isAdminPage = pathname?.startsWith('/admin');
  
  // Admin-accessible product pages that use admin layout - full width
  const adminProductPages = ['/products/create', '/products/upload'];
  const isEditPage = pathname?.includes('/products/') && pathname?.includes('/edit');
  const isAdminProductPage = isAdmin && pathname && (adminProductPages.includes(pathname) || isEditPage);

  // Full-width pages (register, login, forgot-password) - full width
  const fullWidthPages = ['/register', '/login'];
  const isForgotPasswordPage = pathname?.startsWith('/forgot-password');
  const isFullWidthPage = pathname && (fullWidthPages.includes(pathname) || isForgotPasswordPage);

  // Admin pages, admin product pages, and special pages get full width
  // (they have their own dedicated layouts)
  if (isAdminPage || isAdminProductPage || isFullWidthPage) {
    return <div className="h-full w-full">{children}</div>;
  }

  // Regular pages get the constrained width with padding
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {children}
    </div>
  );
}


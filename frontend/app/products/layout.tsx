'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import AdminLayout from '../../components/layouts/AdminLayout';

export default function ProductsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  
  // Admin-accessible product pages that should use admin layout
  const adminProductPages = ['/products/create', '/products/upload'];
  const isEditPage = pathname?.includes('/products/') && pathname?.includes('/edit');
  const shouldUseAdminLayout = isAdmin && pathname && (adminProductPages.includes(pathname) || isEditPage);

  if (shouldUseAdminLayout) {
    return (
      <ProtectedRoute requireAuth requireClientOrAdmin>
        <AdminLayout>{children}</AdminLayout>
      </ProtectedRoute>
    );
  }

  // Regular product pages - no special layout needed
  return (
    <ProtectedRoute requireAuth requireClientOrAdmin>
      {children}
    </ProtectedRoute>
  );
}


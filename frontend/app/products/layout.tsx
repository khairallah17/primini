'use client';

import { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

const AdminLayout = dynamic(
  () => import('../../components/layouts/AdminLayout'),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Chargement...</div>
      </div>
    ),
  }
);

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


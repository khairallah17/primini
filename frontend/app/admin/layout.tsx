'use client';

import { ReactNode } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import AdminLayout from '../../components/layouts/AdminLayout';

/**
 * Admin Layout - Completely separate from regular pages
 * This layout only shows the sidebar, no header or footer
 */
export default function AdminLayoutWrapper({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requireAuth requireAdmin>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}


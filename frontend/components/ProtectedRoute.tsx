'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireClient?: boolean;
  requireClientOrAdmin?: boolean;
  redirectTo?: string;
};

export default function ProtectedRoute({
  children,
  requireAuth = false,
  requireAdmin = false,
  requireClient = false,
  requireClientOrAdmin = false,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading, isAdmin, isClient, isVisitor } = useAuth();

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    // Check authentication requirement
    if (requireAuth && !user) {
      router.push(redirectTo);
      return;
    }

    // Check admin requirement
    if (requireAdmin && !isAdmin) {
      router.push('/');
      return;
    }

    // Check client requirement
    if (requireClient && !isClient) {
      router.push('/');
      return;
    }

    // Check client or admin requirement (blocks visitors)
    if (requireClientOrAdmin && !isClient && !isAdmin) {
      router.push('/');
      return;
    }
  }, [user, loading, isAdmin, isClient, isVisitor, requireAuth, requireAdmin, requireClient, requireClientOrAdmin, router, redirectTo]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  // Check if user meets requirements
  if (requireAuth && !user) {
    return null; // Will redirect
  }

  if (requireAdmin && !isAdmin) {
    return null; // Will redirect
  }

  if (requireClient && !isClient) {
    return null; // Will redirect
  }

  if (requireClientOrAdmin && !isClient && !isAdmin) {
    return null; // Will redirect (blocks visitors)
  }

  return <>{children}</>;
}


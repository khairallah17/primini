'use client';

import dynamic from 'next/dynamic';

const ProductFormScreen = dynamic(
  () => import('@/components/screens/ProductFormScreen'),
  { ssr: false, loading: () => <div className="flex min-h-screen items-center justify-center"><div className="text-lg">Chargement...</div></div> }
);

export default function Page() {
  return <ProductFormScreen />;
}


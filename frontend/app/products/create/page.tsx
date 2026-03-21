'use client';

import dynamic from 'next/dynamic';

const ProductFormScreen = dynamic(
  () => import('@/components/screens/ProductFormScreen'),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[400px] items-center justify-center bg-gray-50">
        <div className="text-gray-500">Chargement...</div>
      </div>
    ),
  }
);

export default function Page() {
  return <ProductFormScreen />;
}


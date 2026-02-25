'use client';

import dynamic from 'next/dynamic';

const CSVUploadScreen = dynamic(
  () => import('@/components/screens/CSVUploadScreen'),
  { ssr: false, loading: () => <div className="flex min-h-screen items-center justify-center"><div className="text-lg">Chargement...</div></div> }
);

export default function Page() {
  return <CSVUploadScreen />;
}


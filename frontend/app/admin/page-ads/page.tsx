'use client';

import dynamic from 'next/dynamic';

const PageAdConfigScreen = dynamic(() => import('../../../components/screens/PageAdConfigScreen'), { ssr: false });

export default function Page() {
  return <PageAdConfigScreen />;
}


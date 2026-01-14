'use client';

import dynamic from 'next/dynamic';

const BlogManagementScreen = dynamic(() => import('../../../components/screens/BlogManagementScreen'), { ssr: false });

export default function Page() {
  return <BlogManagementScreen />;
}


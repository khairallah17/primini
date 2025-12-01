'use client';

import dynamic from 'next/dynamic';

const VerifyOTPScreen = dynamic(() => import('../../../components/screens/VerifyOTPScreen'), { ssr: false });

export default function Page() {
  return <VerifyOTPScreen />;
}


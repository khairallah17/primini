'use client';

import dynamic from 'next/dynamic';

const ResetPasswordScreen = dynamic(() => import('../../../components/screens/ResetPasswordScreen'), { ssr: false });

export default function Page() {
  return <ResetPasswordScreen />;
}


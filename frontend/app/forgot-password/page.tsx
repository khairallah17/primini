'use client';

import dynamic from 'next/dynamic';

const ForgotPasswordScreen = dynamic(() => import('../../components/screens/ForgotPasswordScreen'), { ssr: false });

export default function Page() {
  return <ForgotPasswordScreen />;
}

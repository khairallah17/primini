'use client';

import { Suspense } from 'react';
import VerifyOTPScreen from '@/components/screens/VerifyOTPScreen';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center">Chargement...</div>}>
      <VerifyOTPScreen />
    </Suspense>
  );
}


'use client';

import { Suspense } from 'react';
import ResetPasswordScreen from '@/components/screens/ResetPasswordScreen';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center">Chargement...</div>}>
      <ResetPasswordScreen />
    </Suspense>
  );
}


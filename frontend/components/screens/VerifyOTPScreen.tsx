'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../lib/apiClient';

const verifyOTPSchema = z.object({
  otp_code: z
    .string()
    .min(6, 'Le code doit contenir 6 chiffres')
    .max(6, 'Le code doit contenir 6 chiffres')
    .regex(/^\d+$/, 'Le code doit contenir uniquement des chiffres'),
});

type VerifyOTPFormData = z.infer<typeof verifyOTPSchema>;

export default function VerifyOTPScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get('email') || '';
  const [apiError, setApiError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyOTPFormData>({
    resolver: zodResolver(verifyOTPSchema),
  });

  useEffect(() => {
    if (resetToken) {
      // Redirect to reset password page with token
      router.push(`/forgot-password/reset?token=${encodeURIComponent(resetToken)}`);
    }
  }, [resetToken, router]);

  const onSubmit = async (data: VerifyOTPFormData) => {
    setApiError(null);
    
    if (!email) {
      setApiError('Email manquant. Veuillez recommencer le processus.');
      return;
    }
    
    try {
      const response = await api.post('/auth/password/reset/verify/', {
        email: email,
        otp_code: data.otp_code,
      });
      
      if (response.data.reset_token) {
        setResetToken(response.data.reset_token);
      }
    } catch (err: any) {
      console.warn('Failed to verify OTP', err);
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          setApiError(errorData);
        } else if (errorData.error) {
          setApiError(errorData.error);
        } else if (errorData.otp_code) {
          setApiError(Array.isArray(errorData.otp_code) ? errorData.otp_code[0] : errorData.otp_code);
        } else if (errorData.non_field_errors) {
          setApiError(Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors);
        } else {
          setApiError('Code de vérification invalide. Veuillez réessayer.');
        }
      } else {
        setApiError('Une erreur est survenue. Veuillez réessayer.');
      }
    }
  };

  if (!email) {
    return (
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 bg-primary p-4 md:p-6">
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md space-y-4 text-center">
              <p className="text-white">Email manquant. Veuillez recommencer le processus.</p>
              <Link href="/forgot-password" className="text-secondary hover:underline">
                Retour
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 bg-primary p-4 md:p-6">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <Image
              src="/images/avito-colors.jpeg"
              alt="Avita"
              width={120}
              height={40}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-white">Vérification du code</h1>
              <p className="text-sm text-white/80">
                Entrez le code à 6 chiffres envoyé à <span className="font-medium">{email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {apiError && (
                <div className="rounded-md bg-red-500/20 border border-red-400/50 p-3 text-sm text-red-100">
                  {apiError}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-medium text-white" htmlFor="otp_code">
                  Code de vérification *
                </label>
                <input
                  id="otp_code"
                  type="text"
                  maxLength={6}
                  {...register('otp_code')}
                  className={`w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder-white/60 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 text-center text-2xl tracking-widest ${
                    errors.otp_code ? 'border-red-400' : ''
                  }`}
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
                {errors.otp_code && (
                  <p className="mt-1 text-sm text-red-300">{errors.otp_code.message}</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Vérification...' : 'Vérifier le code'}
              </button>
              <div className="text-center text-sm">
                <Link 
                  href={`/forgot-password?email=${encodeURIComponent(email)}`} 
                  className="text-white/80 hover:text-white transition-colors hover:underline"
                >
                  Renvoyer le code
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <Image
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
          alt="Cover"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}


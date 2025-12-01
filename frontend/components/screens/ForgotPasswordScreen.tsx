'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../lib/apiClient';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'adresse email est requise')
    .email('Format d\'email invalide'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setApiError(null);
    setSuccess(false);
    
    try {
      const response = await api.post('/auth/password/reset/request/', {
        email: data.email,
      });
      
      setSuccess(true);
      setCountdown(60); // 1 minute countdown
      
      // Start countdown timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Redirect to OTP page after a short delay
      setTimeout(() => {
        router.push(`/forgot-password/verify?email=${encodeURIComponent(data.email)}`);
      }, 2000);
    } catch (err: any) {
      console.warn('Failed to request password reset', err);
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          setApiError(errorData);
        } else if (errorData.error) {
          setApiError(errorData.error);
        } else if (errorData.email) {
          setApiError(Array.isArray(errorData.email) ? errorData.email[0] : errorData.email);
        } else {
          setApiError('Une erreur est survenue. Veuillez réessayer.');
        }
      } else {
        setApiError('Une erreur est survenue. Veuillez réessayer.');
      }
    }
  };

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
              <h1 className="text-2xl font-semibold text-white">Mot de passe oublié</h1>
              <p className="text-sm text-white/80">
                Entrez votre adresse email et nous vous enverrons un code de vérification.
              </p>
            </div>

            {success ? (
              <div className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm p-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20">
                    <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/90">
                    Un code de vérification a été envoyé à votre adresse email.
                  </p>
                  {countdown > 0 && (
                    <p className="text-xs text-white/70">
                      Vous pouvez demander un nouveau code dans {countdown} seconde{countdown > 1 ? 's' : ''}.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {apiError && (
                  <div className="rounded-md bg-red-500/20 border border-red-400/50 p-3 text-sm text-red-100">
                    {apiError}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-white" htmlFor="email">
                    Adresse email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    className={`w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder-white/60 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 ${
                      errors.email ? 'border-red-400' : ''
                    }`}
                    placeholder="votre@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-300">{errors.email.message}</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Envoi...' : 'Envoyer le code'}
                </button>
                <div className="text-center text-sm">
                  <Link href="/login" className="text-white/80 hover:text-white transition-colors hover:underline">
                    Retour à la connexion
                  </Link>
                </div>
              </form>
            )}
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

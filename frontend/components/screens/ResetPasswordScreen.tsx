'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../lib/apiClient';

const resetPasswordSchema = z.object({
  new_password: z
    .string()
    .min(1, 'Le mot de passe est requis')
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
    ),
  confirm_password: z.string().min(1, 'La confirmation du mot de passe est requise'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || '';
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (success) {
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  }, [success, router]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setApiError(null);
    
    if (!token) {
      setApiError('Token manquant. Veuillez recommencer le processus.');
      return;
    }
    
    try {
      await api.post('/auth/password/reset/', {
        reset_token: token,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      });
      
      setSuccess(true);
    } catch (err: any) {
      console.warn('Failed to reset password', err);
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          setApiError(errorData);
        } else if (errorData.error) {
          setApiError(errorData.error);
        } else if (errorData.reset_token) {
          setApiError(Array.isArray(errorData.reset_token) ? errorData.reset_token[0] : errorData.reset_token);
        } else if (errorData.new_password) {
          setApiError(Array.isArray(errorData.new_password) ? errorData.new_password[0] : errorData.new_password);
        } else if (errorData.confirm_password) {
          setApiError(Array.isArray(errorData.confirm_password) ? errorData.confirm_password[0] : errorData.confirm_password);
        } else {
          setApiError('Une erreur est survenue. Veuillez réessayer.');
        }
      } else {
        setApiError('Une erreur est survenue. Veuillez réessayer.');
      }
    }
  };

  if (!token) {
    return (
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 bg-primary p-4 md:p-6">
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md space-y-4 text-center">
              <p className="text-white">Token manquant. Veuillez recommencer le processus.</p>
              <Link href="/forgot-password" className="text-secondary hover:underline">
                Retour
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 bg-primary p-4 md:p-6">
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md space-y-4">
              <div className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm p-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20">
                    <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-white">Mot de passe réinitialisé</h2>
                  <p className="text-sm text-white/90">
                    Votre mot de passe a été réinitialisé avec succès. Vous allez être redirigé vers la page de connexion.
                  </p>
                </div>
              </div>
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
            unoptimized={true}
          />
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
              unoptimized={true}
            />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-white">Nouveau mot de passe</h1>
              <p className="text-sm text-white/80">
                Entrez votre nouveau mot de passe.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {apiError && (
                <div className="rounded-md bg-red-500/20 border border-red-400/50 p-3 text-sm text-red-100">
                  {apiError}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-medium text-white" htmlFor="new_password">
                  Nouveau mot de passe *
                </label>
                <input
                  id="new_password"
                  type="password"
                  {...register('new_password')}
                  className={`w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder-white/60 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 ${
                    errors.new_password ? 'border-red-400' : ''
                  }`}
                  placeholder="••••••••"
                />
                {errors.new_password && (
                  <p className="mt-1 text-sm text-red-300">{errors.new_password.message}</p>
                )}
                <p className="text-xs text-white/70 mt-1">
                  Au moins 8 caractères avec majuscule, minuscule et chiffre
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-white" htmlFor="confirm_password">
                  Confirmer le mot de passe *
                </label>
                <input
                  id="confirm_password"
                  type="password"
                  {...register('confirm_password')}
                  className={`w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder-white/60 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 ${
                    errors.confirm_password ? 'border-red-400' : ''
                  }`}
                  placeholder="••••••••"
                />
                {errors.confirm_password && (
                  <p className="mt-1 text-sm text-red-300">{errors.confirm_password.message}</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
              </button>
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
          unoptimized={true}
        />
      </div>
    </div>
  );
}


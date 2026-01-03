'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../context/AuthContext';
import { loginSchema, type LoginFormData } from '../../lib/validations';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      await login(data.email, data.password);
      router.push('/');
    } catch (err: any) {
      console.warn('Failed to login', err);
      // Extract error message from API response
      if (err.response?.data) {
        const errorData = err.response.data;
        let errorMessage = '';
        
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.non_field_errors) {
          errorMessage = Array.isArray(errorData.non_field_errors) 
            ? errorData.non_field_errors[0] 
            : errorData.non_field_errors;
        } else if (errorData.email) {
          errorMessage = Array.isArray(errorData.email) 
            ? errorData.email[0] 
            : errorData.email;
        } else {
          errorMessage = 'Identifiants incorrects. Veuillez réessayer.';
        }
        
        // Check if the error indicates an inactive account
        const errorLower = errorMessage.toLowerCase();
        if (errorLower.includes('inactive') || errorLower.includes('désactivé') || 
            errorLower.includes('non actif') || errorLower.includes('non activé')) {
          setApiError('Votre compte n\'est pas encore activé. Un administrateur vous contactera dès que votre compte sera approuvé.');
        } else {
          setApiError(errorMessage);
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
              unoptimized={true}
            />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-white">Connexion</h1>
              <p className="text-sm text-white/80">Ravi de vous revoir sur Avita</p>
            </div>

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
              <div className="space-y-1">
                <label className="text-sm font-medium text-white" htmlFor="password">
                  Mot de passe *
                </label>
                <input
                  id="password"
                  type="password"
                  {...register('password')}
                  className={`w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder-white/60 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 ${
                    errors.password ? 'border-red-400' : ''
                  }`}
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-300">{errors.password.message}</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Connexion...' : 'Se connecter'}
              </button>
              <div className="flex justify-between text-sm">
                <Link href="/forgot-password" className="text-white/80 hover:text-white transition-colors hover:underline">
                  Mot de passe oublié ?
                </Link>
                <Link href="/register" className="text-white/80 hover:text-white transition-colors hover:underline">
                  Créer un compte
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
          unoptimized={true}
        />
      </div>
    </div>
  );
}

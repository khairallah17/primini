'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { clientRegisterSchema, userRegisterSchema, type ClientRegisterFormData, type UserRegisterFormData } from '../../lib/validations';

type RegisterType = 'client' | 'user';

export default function RegisterScreen() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [registerType, setRegisterType] = useState<RegisterType>('client');

  // Use different schemas based on register type
  const clientForm = useForm<ClientRegisterFormData>({
    resolver: zodResolver(clientRegisterSchema),
  });

  const userForm = useForm<UserRegisterFormData>({
    resolver: zodResolver(userRegisterSchema),
  });

  // Get the active form based on register type
  const activeForm = registerType === 'client' ? clientForm : userForm;

  const onSubmit = async (data: ClientRegisterFormData | UserRegisterFormData) => {
    setApiError(null);
    try {
      const registrationData: Record<string, unknown> = {
        username: data.username,
        email: data.email,
        password1: data.password1,
        password2: data.password2,
        first_name: data.first_name,
        last_name: data.last_name,
        role: registerType, // Send the role to backend
      };

      // Add enterprise fields only for client registration
      if (registerType === 'client') {
        const clientData = data as ClientRegisterFormData;
        registrationData.enterprise_name = clientData.enterprise_name;
        registrationData.address = clientData.address;
        registrationData.phone_number = clientData.phone_number;
      }

      await registerUser(registrationData);
      setShowSuccessMessage(true);
    } catch (err: any) {
      console.warn('Failed to register', err);
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          setApiError(errorData);
        } else if (errorData.detail) {
          setApiError(errorData.detail);
        } else if (errorData.non_field_errors) {
          setApiError(Array.isArray(errorData.non_field_errors) 
            ? errorData.non_field_errors[0] 
            : errorData.non_field_errors);
        } else {
          setApiError('Une erreur est survenue lors de la création du compte. Veuillez réessayer.');
        }
      } else {
        setApiError('Une erreur est survenue lors de la création du compte. Veuillez réessayer.');
      }
    }
  };

  const handleTypeChange = (type: RegisterType) => {
    setRegisterType(type);
    setApiError(null);
    // Reset forms when switching
    clientForm.reset();
    userForm.reset();
  };

  if (showSuccessMessage) {
    const isClient = registerType === 'client';
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
            <div className="w-full max-w-md">
              <div className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-sm p-8 shadow-lg">
                <div className="text-center space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
                    <svg className="h-8 w-8 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold text-white">Compte créé avec succès !</h2>
                  {isClient ? (
                    <>
                      <p className="text-sm text-white/90">
                        Votre compte a été créé et est en attente d&apos;approbation par un administrateur.
                      </p>
                      <p className="text-sm text-white/80">
                        Un administrateur vous contactera dès que votre compte sera activé.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-white/90">
                      Votre compte utilisateur a été créé avec succès. Vous pouvez maintenant vous connecter.
                    </p>
                  )}
                  <div className="pt-4">
                    <Link
                      href="/login"
                      className="inline-block rounded-full bg-secondary px-6 py-3 text-sm font-semibold text-white hover:bg-secondary/90 transition-colors shadow-lg"
                    >
                      Retour à la connexion
                    </Link>
                  </div>
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
              <h1 className="text-2xl font-semibold text-white">Créer un compte</h1>
              <p className="text-sm text-white/80">Choisissez le type de compte que vous souhaitez créer.</p>
            </div>

            {/* Registration Type Tabs */}
            <div className="flex gap-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-1">
              <button
                type="button"
                onClick={() => handleTypeChange('client')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  registerType === 'client'
                    ? 'bg-secondary text-white shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Compte Client
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('user')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  registerType === 'user'
                    ? 'bg-secondary text-white shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Compte Utilisateur
              </button>
            </div>

            <form onSubmit={activeForm.handleSubmit(onSubmit)} className="space-y-4">
              {apiError && (
                <div className="rounded-md bg-red-500/20 border border-red-400/50 p-3 text-sm text-red-100">
                  {apiError}
                </div>
              )}

              {/* Common Fields */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-white" htmlFor="username">
                  Nom d&apos;utilisateur
                </label>
                <input
                  id="username"
                  type="text"
                  {...(activeForm.register as any)('username')}
                  className={`w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder-white/60 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 ${
                    activeForm.formState.errors.username ? 'border-red-400' : ''
                  }`}
                  placeholder="nom_utilisateur"
                />
                {activeForm.formState.errors.username && (
                  <p className="text-sm text-red-300">{activeForm.formState.errors.username.message}</p>
                )}
                <p className="text-xs text-white/70 mt-1">
                  Lettres, chiffres et underscores uniquement (3-150 caractères)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-white" htmlFor="first_name">
                    Prénom *
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    {...(activeForm.register as any)('first_name')}
                    className={`w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder-white/60 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 ${
                      activeForm.formState.errors.first_name ? 'border-red-400' : ''
                    }`}
                  />
                  {activeForm.formState.errors.first_name && (
                    <p className="text-sm text-red-300">{activeForm.formState.errors.first_name.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-white" htmlFor="last_name">
                    Nom *
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    {...(activeForm.register as any)('last_name')}
                    className={`w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder-white/60 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 ${
                      activeForm.formState.errors.last_name ? 'border-red-400' : ''
                    }`}
                  />
                  {activeForm.formState.errors.last_name && (
                    <p className="text-sm text-red-300">{activeForm.formState.errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-white" htmlFor="email">
                  Adresse email *
                </label>
                <input
                  id="email"
                  type="email"
                  {...(activeForm.register as any)('email')}
                  className={`w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder-white/60 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 ${
                    activeForm.formState.errors.email ? 'border-red-400' : ''
                  }`}
                  placeholder="votre@email.com"
                />
                {activeForm.formState.errors.email && (
                  <p className="text-sm text-red-300">{activeForm.formState.errors.email.message}</p>
                )}
              </div>

              {/* Client-specific fields */}
              {registerType === 'client' && (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white" htmlFor="enterprise_name">
                      Nom de l&apos;entreprise *
                    </label>
                    <input
                      id="enterprise_name"
                      type="text"
                      {...clientForm.register('enterprise_name')}
                      className={`w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder-white/60 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 ${
                        clientForm.formState.errors.enterprise_name ? 'border-red-400' : ''
                      }`}
                      placeholder="Nom de votre entreprise"
                    />
                    {clientForm.formState.errors.enterprise_name && (
                      <p className="text-sm text-red-300">{clientForm.formState.errors.enterprise_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white" htmlFor="address">
                      Adresse *
                    </label>
                    <textarea
                      id="address"
                      {...clientForm.register('address')}
                      rows={3}
                      className={`w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder-white/60 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 ${
                        clientForm.formState.errors.address ? 'border-red-400' : ''
                      }`}
                      placeholder="Adresse complète de l'entreprise"
                    />
                    {clientForm.formState.errors.address && (
                      <p className="text-sm text-red-300">{clientForm.formState.errors.address.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-white" htmlFor="phone_number">
                      Numéro de téléphone *
                    </label>
                    <input
                      id="phone_number"
                      type="tel"
                      {...clientForm.register('phone_number')}
                      className={`w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder-white/60 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 ${
                        clientForm.formState.errors.phone_number ? 'border-red-400' : ''
                      }`}
                      placeholder="+212 6XX XXX XXX"
                    />
                    {clientForm.formState.errors.phone_number && (
                      <p className="text-sm text-red-300">{clientForm.formState.errors.phone_number.message}</p>
                    )}
                  </div>
                </>
              )}

              {/* Password fields */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-white" htmlFor="password1">
                  Mot de passe
                </label>
                <input
                  id="password1"
                  type="password"
                  {...(activeForm.register as any)('password1')}
                  className={`w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder-white/60 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 ${
                    activeForm.formState.errors.password1 ? 'border-red-400' : ''
                  }`}
                />
                {activeForm.formState.errors.password1 && (
                  <p className="text-sm text-red-300">{activeForm.formState.errors.password1.message}</p>
                )}
                <p className="text-xs text-white/70 mt-1">
                  Au moins 8 caractères avec majuscule, minuscule et chiffre
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-white" htmlFor="password2">
                  Confirmation
                </label>
                <input
                  id="password2"
                  type="password"
                  {...(activeForm.register as any)('password2')}
                  className={`w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white placeholder-white/60 focus:border-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 ${
                    activeForm.formState.errors.password2 ? 'border-red-400' : ''
                  }`}
                />
                {activeForm.formState.errors.password2 && (
                  <p className="text-sm text-red-300">{activeForm.formState.errors.password2.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary/90 disabled:opacity-60 transition-colors shadow-lg"
                disabled={activeForm.formState.isSubmitting}
              >
                {activeForm.formState.isSubmitting ? 'Création...' : `Créer un compte ${registerType === 'client' ? 'client' : 'utilisateur'}`}
              </button>

              <div className="text-center text-sm text-white/80">
                <Link href="/login" className="text-white hover:text-white transition-colors hover:underline">
                  Déjà un compte ? Se connecter
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

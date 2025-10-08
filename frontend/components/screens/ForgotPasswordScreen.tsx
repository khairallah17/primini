'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import api from '../../lib/apiClient';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await api.post('/auth/password/reset/', { email });
      setMessage('Un email de réinitialisation vous a été envoyé.');
    } catch (error) {
      console.warn('Failed to request password reset', error);
      setMessage('Impossible de traiter votre demande pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Mot de passe oublié</h1>
        <p className="text-sm text-slate-500">
          Entrez votre adresse email et nous vous enverrons un lien de réinitialisation.
        </p>
      </header>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600" htmlFor="email">
            Adresse email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Envoi...' : 'Envoyer le lien'}
        </button>
        {message && <p className="text-sm text-slate-600">{message}</p>}
        <p className="text-center text-sm text-slate-500">
          <Link href="/login" className="text-primary">
            Revenir à la connexion
          </Link>
        </p>
      </form>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ email: '', password1: '', password2: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.password1 !== form.password2) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({
        email: form.email,
        password1: form.password1,
        password2: form.password2
      });
      router.push('/login');
    } catch (err) {
      console.warn('Failed to register', err);
      setError("Impossible de créer votre compte. Essayez à nouveau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Créer un compte</h1>
        <p className="text-sm text-slate-500">Accédez à vos alertes et sauvegardez vos produits favoris.</p>
      </header>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600" htmlFor="email">
            Adresse email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600" htmlFor="password1">
            Mot de passe
          </label>
          <input
            id="password1"
            type="password"
            value={form.password1}
            onChange={(event) => setForm((prev) => ({ ...prev, password1: event.target.value }))}
            required
            minLength={8}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600" htmlFor="password2">
            Confirmation
          </label>
          <input
            id="password2"
            type="password"
            value={form.password2}
            onChange={(event) => setForm((prev) => ({ ...prev, password2: event.target.value }))}
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Inscription...' : "S'inscrire"}
        </button>
        <p className="text-center text-sm text-slate-500">
          Déjà membre ?{' '}
          <Link href="/login" className="text-primary">
            Connectez-vous
          </Link>
        </p>
      </form>
    </div>
  );
}

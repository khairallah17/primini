'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      console.warn('Failed to login', err);
      setError('Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Connexion</h1>
        <p className="text-sm text-slate-500">Ravi de vous revoir sur Primini.ma</p>
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
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
        <div className="flex justify-between text-sm text-slate-500">
          <Link href="/forgot-password" className="text-primary">
            Mot de passe oublié ?
          </Link>
          <Link href="/register" className="text-primary">
            Créer un compte
          </Link>
        </div>
      </form>
    </div>
  );
}

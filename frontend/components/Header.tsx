'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { href: '/deals', label: 'Bons Plans' },
  { href: '/magic-tool', label: "L'outil magique" },
  { href: '/categories', label: 'Catégories' }
];

export default function Header() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();

  return (
    <header className="bg-white/90 backdrop-blur sticky top-0 z-40 border-b border-slate-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="text-2xl font-semibold text-primary">
          Avita
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname.startsWith(link.href)
                  ? 'text-primary'
                  : 'transition-colors hover:text-primary'
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {loading ? (
          <span className="hidden rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 md:block">
            Chargement…
          </span>
        ) : user ? (
          <button
            onClick={logout}
            className="hidden rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-md md:block"
            type="button"
          >
            Déconnexion
          </button>
        ) : (
          <Link
            href="/login"
            className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md md:block"
          >
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}

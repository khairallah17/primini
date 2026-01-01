'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const infoLinks = [
  { href: '/about', label: 'À propos' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
  { href: '/terms', label: "Conditions d'utilisation" }
];

const socialLinks = [
  { href: 'https://www.facebook.com', label: 'Facebook' },
  { href: 'https://www.instagram.com', label: 'Instagram' },
  { href: 'https://www.linkedin.com', label: 'LinkedIn' }
];

export default function Footer() {
  const pathname = usePathname();
  
  // Hide footer on admin pages and auth pages
  if (pathname?.startsWith('/admin') || pathname === '/register' || pathname === '/login') {
    return null;
  }
  
  return (
    <footer className="bg-primary text-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-3">
        <div>
          <Link href="/" className="inline-block">
            <Image
              src="/images/avito-colors.jpeg"
              alt="Avita"
              width={120}
              height={40}
              className="h-10 w-auto object-contain mb-4"
              priority
            />
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-white/80">
            Avita compare les prix des meilleurs marchands marocains pour vous aider à trouver les
            bons plans high-tech et électroménager.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Informations</h4>
          <ul className="mt-4 space-y-2 text-sm">
            {infoLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-secondary text-white/80">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Suivez-nous</h4>
          <ul className="mt-4 space-y-2 text-sm">
            {socialLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="transition-colors hover:text-secondary text-white/80">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="bg-primary-dark py-6 text-center text-xs text-white/60">
        © {new Date().getFullYear()} Avita — Tous droits réservés.
      </div>
    </footer>
  );
}

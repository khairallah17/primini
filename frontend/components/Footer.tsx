import Link from 'next/link';

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
  return (
    <footer className="mt-16 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-3">
        <div>
          <h3 className="text-xl font-semibold text-white">Primini.ma</h3>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Primini.ma compare les prix des meilleurs marchands marocains pour vous aider à trouver les
            bons plans high-tech et électroménager.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Informations</h4>
          <ul className="mt-4 space-y-2 text-sm">
            {infoLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-secondary">
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
                <a href={link.href} className="transition-colors hover:text-secondary">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="bg-slate-900 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Primini.ma — Tous droits réservés.
      </div>
    </footer>
  );
}

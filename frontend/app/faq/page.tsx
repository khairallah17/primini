import Link from 'next/link';

const sections = [
  { href: '/faq/products', label: 'Produits' },
  { href: '/faq/prices', label: 'Prix & promotions' },
  { href: '/faq/merchants', label: 'Marchands' }
];

export const metadata = {
  title: 'FAQ — Primini.ma'
};

export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-slate-900">Questions fréquentes</h1>
      <p className="text-sm text-slate-600">
        Trouvez des réponses aux questions les plus courantes sur le fonctionnement du comparateur.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-700 shadow-sm"
          >
            {section.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

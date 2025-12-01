export const metadata = {
  title: 'À propos — Avita'
};

export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-slate-900">À propos d'Avita</h1>
      <p className="text-sm leading-relaxed text-slate-600">
        Avita est un comparateur de prix marocain dédié aux produits high-tech, gaming et électroménager. Nous
        analysons quotidiennement les offres des marchands partenaires pour vous proposer les meilleurs prix et vous
        accompagner dans vos achats.
      </p>
      <p className="text-sm leading-relaxed text-slate-600">
        Notre mission est simple : vous faire gagner du temps et de l&apos;argent grâce à des outils intelligents,
        transparents et gratuits.
      </p>
    </div>
  );
}

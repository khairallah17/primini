export const metadata = {
  title: "Conditions d'utilisation — Avita"
};

export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-slate-900">Conditions d&apos;utilisation</h1>
      <p className="text-sm leading-relaxed text-slate-600">
        L&apos;utilisation d&apos;Avita implique l&apos;acceptation des présentes conditions générales. Les prix et fiches
        produits proviennent des sites marchands et peuvent changer sans préavis.
      </p>
      <ul className="list-disc space-y-2 pl-6 text-sm text-slate-600">
        <li>Avita ne vend pas de produits et redirige vers des marchands tiers.</li>
        <li>Les alertes prix sont envoyées par email selon vos préférences.</li>
        <li>Nous respectons la confidentialité de vos données et ne partageons jamais votre email.</li>
      </ul>
    </div>
  );
}

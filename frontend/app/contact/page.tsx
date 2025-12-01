export const metadata = {
  title: 'Contact — Avita'
};

export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-slate-900">Contactez-nous</h1>
      <p className="text-sm leading-relaxed text-slate-600">
        Une question sur nos services ou une suggestion d&apos;amélioration ? Notre équipe se fera un plaisir de vous
        répondre dans les plus brefs délais.
      </p>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Email : contact@avita.ma</p>
        <p className="text-sm text-slate-600">WhatsApp : +212 6 12 34 56 78</p>
      </div>
    </div>
  );
}

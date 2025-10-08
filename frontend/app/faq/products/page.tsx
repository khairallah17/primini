const faqs = [
  {
    question: 'Comment sélectionnez-vous les produits ? ',
    answer:
      'Nous récupérons automatiquement les produits des marchands marocains partenaires et les enrichissons avec des fiches techniques détaillées.'
  },
  {
    question: 'Puis-je suggérer un produit ?',
    answer: 'Oui, contactez-nous via le formulaire et nous l’ajouterons s’il correspond à notre catalogue.'
  }
];

export default function Page() {
  return (
    <FaqSection title="Produits" faqs={faqs} />
  );
}

function FaqSection({ title, faqs }: { title: string; faqs: { question: string; answer: string }[] }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-slate-900">FAQ — {title}</h1>
      <div className="space-y-4">
        {faqs.map((faq) => (
          <div key={faq.question} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-primary">{faq.question}</h2>
            <p className="mt-2 text-sm text-slate-600">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

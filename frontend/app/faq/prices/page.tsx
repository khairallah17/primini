const faqs = [
  {
    question: 'Les prix sont-ils mis à jour automatiquement ? ',
    answer: 'Oui, nos robots vérifient les changements plusieurs fois par jour pour garantir des informations fraîches.'
  },
  {
    question: 'Proposez-vous des codes promo ?',
    answer: 'Lorsque des bons plans sont disponibles, nous les affichons directement sur la fiche du produit.'
  }
];

export default function Page() {
  return <FaqSection title="Prix & promotions" faqs={faqs} />;
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

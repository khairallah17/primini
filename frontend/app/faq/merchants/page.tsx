const faqs = [
  {
    question: 'Comment choisissez-vous les marchands ?',
    answer:
      'Nous sélectionnons des partenaires fiables, disposant de conditions de vente claires et d’un service client réactif.'
  },
  {
    question: 'Puis-je devenir marchand partenaire ?',
    answer:
      'Oui, écrivez-nous à partners@primini.ma et notre équipe vous répondra avec les modalités.'
  }
];

export default function Page() {
  return <FaqSection title="Marchands" faqs={faqs} />;
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

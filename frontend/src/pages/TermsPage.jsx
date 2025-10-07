import { useEffect, useState } from 'react';
import { fetchPage } from '../api/client.js';

export default function TermsPage() {
  const [page, setPage] = useState(null);

  useEffect(() => {
    fetchPage('terms').then(setPage).catch(() => setPage(null));
  }, []);

  return (
    <section className="card" style={{ display: 'grid', gap: '1.5rem' }}>
      <h1>Conditions d’utilisation</h1>
      {page ? (
        <div dangerouslySetInnerHTML={{ __html: page.body }} />
      ) : (
        <p>
          Conditions d’utilisation fictives : l’utilisation de cette démo implique l’acceptation d’une expérience
          pédagogique et non commerciale.
        </p>
      )}
    </section>
  );
}

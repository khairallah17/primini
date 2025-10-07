import { useEffect, useState } from 'react';
import { fetchPage } from '../api/client.js';

export default function AboutPage() {
  const [page, setPage] = useState(null);

  useEffect(() => {
    fetchPage('about').then(setPage).catch(() => setPage(null));
  }, []);

  return (
    <section className="card" style={{ display: 'grid', gap: '1.5rem' }}>
      <h1>À propos</h1>
      {page ? (
        <div dangerouslySetInnerHTML={{ __html: page.body }} />
      ) : (
        <p>
          Primini.ma est un comparateur de prix fictif qui met en avant des offres technologiques.
        </p>
      )}
    </section>
  );
}

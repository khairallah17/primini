import { useState } from 'react';
import { createMagicLookup } from '../api/client.js';

export default function MagicToolPage() {
  const [link, setLink] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!link) return;
    setLoading(true);
    try {
      const data = await createMagicLookup(link);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card" style={{ display: 'grid', gap: '1.5rem' }}>
      <header>
        <h1>L’outil magique</h1>
        <p>Collez un lien produit pour vérifier si une meilleure offre est disponible.</p>
      </header>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="url"
          placeholder="https://boutique-marque.ma/produit"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Analyse en cours…' : 'Comparer'}
        </button>
      </form>
      {result && (
        <div style={{ background: '#f5f3ff', padding: '1rem', borderRadius: '12px' }}>
          <h3>Résultat</h3>
          <pre style={styles.pre}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </section>
  );
}

const styles = {
  form: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: '240px',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    border: '1px solid #e0e7ff',
  },
  button: {
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    background: '#7c3aed',
    color: 'white',
    fontWeight: 600,
    border: 'none',
  },
  pre: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};

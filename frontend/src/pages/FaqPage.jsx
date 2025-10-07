import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { fetchFaq } from '../api/client.js';

const sections = [
  { key: 'general', label: 'Général', path: '/faq' },
  { key: 'products', label: 'Produits', path: '/faq/products' },
  { key: 'prices', label: 'Prix', path: '/faq/prices' },
  { key: 'merchants', label: 'Marchands', path: '/faq/merchants' },
];

function FaqSection({ section }) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    fetchFaq(section).then(setEntries);
  }, [section]);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {entries.map((entry) => (
        <div key={entry.id} style={styles.entry}>
          <h3>{entry.question}</h3>
          <p>{entry.answer}</p>
        </div>
      ))}
    </div>
  );
}

export default function FaqPage() {
  const location = useLocation();

  return (
    <section style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '220px 1fr' }}>
      <aside className="card" style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
        {sections.map((section) => (
          <Link
            key={section.key}
            to={section.path}
            style={{
              fontWeight: location.pathname === section.path ? 700 : 500,
              color: location.pathname === section.path ? '#f97316' : '#4c1d95',
            }}
          >
            {section.label}
          </Link>
        ))}
      </aside>
      <div className="card" style={{ padding: '1.5rem' }}>
        <Routes>
          <Route index element={<FaqSection section="general" />} />
          <Route path="products" element={<FaqSection section="products" />} />
          <Route path="prices" element={<FaqSection section="prices" />} />
          <Route path="merchants" element={<FaqSection section="merchants" />} />
        </Routes>
      </div>
    </section>
  );
}

const styles = {
  entry: {
    background: '#f9fafb',
    padding: '1rem',
    borderRadius: '12px',
  },
};

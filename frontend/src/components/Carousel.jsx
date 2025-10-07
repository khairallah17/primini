import { useRef } from 'react';

export default function Carousel({ title, items, renderItem }) {
  const containerRef = useRef(null);

  const scroll = (direction) => {
    const container = containerRef.current;
    if (!container) return;
    const offset = direction === 'next' ? container.clientWidth : -container.clientWidth;
    container.scrollBy({ left: offset, behavior: 'smooth' });
  };

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <div className="section-title">
        <h2>{title}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={styles.navButton} onClick={() => scroll('prev')} aria-label="Précédent">
            ←
          </button>
          <button style={styles.navButton} onClick={() => scroll('next')} aria-label="Suivant">
            →
          </button>
        </div>
      </div>
      <div ref={containerRef} style={styles.container}>
        {items.map((item) => (
          <div key={item.id || item.slug} style={styles.slide}>
            {renderItem(item)}
          </div>
        ))}
      </div>
    </section>
  );
}

const styles = {
  container: {
    display: 'grid',
    gridAutoFlow: 'column',
    gridAutoColumns: 'minmax(260px, 320px)',
    gap: '1.25rem',
    overflowX: 'auto',
    scrollSnapType: 'x mandatory',
    paddingBottom: '0.5rem',
  },
  slide: {
    scrollSnapAlign: 'start',
  },
  navButton: {
    borderRadius: '999px',
    border: 'none',
    padding: '0.5rem 0.75rem',
    background: '#ede9fe',
    color: '#7c3aed',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

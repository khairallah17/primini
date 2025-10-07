import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.columns}>
        <div>
          <h3 style={styles.title}>Primini.ma</h3>
          <p style={styles.description}>
            Comparez les prix des meilleurs produits tech et trouvez l’offre idéale chez nos partenaires.
          </p>
        </div>
        <div>
          <h4 style={styles.heading}>Navigation</h4>
          <ul style={styles.list}>
            <li><Link to="/deals">Bons Plans</Link></li>
            <li><Link to="/magic-tool">L’outil magique</Link></li>
            <li><Link to="/categories">Catégories</Link></li>
          </ul>
        </div>
        <div>
          <h4 style={styles.heading}>Informations</h4>
          <ul style={styles.list}>
            <li><Link to="/about">À propos</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/terms">Conditions d’utilisation</Link></li>
          </ul>
        </div>
      </div>
      <p style={styles.copy}>© {new Date().getFullYear()} Primini.ma – Clone pédagogique</p>
    </footer>
  );
}

const styles = {
  footer: {
    background: '#1c1336',
    color: 'white',
    padding: '3rem 2rem',
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '2rem',
    marginBottom: '2rem',
  },
  title: {
    margin: '0 0 0.75rem 0',
  },
  description: {
    opacity: 0.8,
  },
  heading: {
    marginBottom: '0.75rem',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gap: '0.5rem',
  },
  copy: {
    opacity: 0.6,
    textAlign: 'center',
    margin: 0,
  },
};

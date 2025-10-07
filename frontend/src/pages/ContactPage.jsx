export default function ContactPage() {
  return (
    <section className="card" style={{ display: 'grid', gap: '1.5rem', maxWidth: '640px', margin: '0 auto' }}>
      <h1>Contact</h1>
      <p>
        Une question, un partenariat ou un retour d’expérience ? Écrivez-nous à{' '}
        <a href="mailto:hello@primini.ma">hello@primini.ma</a> ou remplissez le formulaire ci-dessous.
      </p>
      <form style={{ display: 'grid', gap: '1rem' }}>
        <label>
          Nom
          <input type="text" required style={styles.input} />
        </label>
        <label>
          E-mail
          <input type="email" required style={styles.input} />
        </label>
        <label>
          Message
          <textarea required rows="4" style={styles.textarea} />
        </label>
        <button type="submit" style={styles.button}>
          Envoyer
        </button>
      </form>
    </section>
  );
}

const styles = {
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    border: '1px solid #e0e7ff',
    marginTop: '0.35rem',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    border: '1px solid #e0e7ff',
    marginTop: '0.35rem',
  },
  button: {
    padding: '0.75rem 1.25rem',
    borderRadius: '12px',
    border: 'none',
    background: '#7c3aed',
    color: 'white',
    fontWeight: 600,
  },
};

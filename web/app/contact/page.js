export const metadata = {
  title: 'Contact',
  description: 'Contactez la rédaction de BuzzAfrique : partenariats, suggestions de sujets, corrections.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <div className="container narrow page-title">
      <h1>Contact</h1>
      <p>Une question, une suggestion de sujet ou un partenariat ? Écrivez-nous.</p>
      <div className="panel" style={{ marginTop: 22 }}>
        <p style={{ marginTop: 0 }}>
          📧 <a href="mailto:contact@buzzafrique.com">contact@buzzafrique.com</a>
        </p>
        <p>
          Pour proposer un sujet à l’agent IA, indiquez votre mot-clé et votre pays : il sera
          ajouté en priorité dans la file de rédaction.
        </p>
        <p style={{ marginBottom: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
          Réponse sous 48 h ouvrées.
        </p>
      </div>
    </div>
  );
}

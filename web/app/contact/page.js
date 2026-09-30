import { SITE, DEVIS_URL } from '@/lib/site';

export const metadata = {
  title: 'Contact',
  description:
    'Contactez la rédaction de BuzzAfrique : partenariats, suggestions de sujets, corrections — et demandes de devis pour votre site web.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <div className="container narrow">
      <div className="page-head">
        <h1>Contact</h1>
        <p>Une question, une suggestion de sujet ou un partenariat ? Écrivez-nous.</p>
      </div>

      <div className="prose-card" style={{ marginTop: 24 }}>
        <h2>Rédaction</h2>
        <p>
          📧{' '}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          <br />
          Réponse sous 48 h ouvrées.
        </p>

        <h2>Proposer un sujet</h2>
        <p>
          Indiquez votre mot-clé, votre pays et l&apos;angle souhaité : les demandes claires sont
          ajoutées en priorité au programme de publication.
        </p>

        <h2>Création de sites web</h2>
        <p>
          Nous réalisons des sites vitrines, blogs et boutiques en ligne rapides et optimisés pour
          Google.{' '}
          <a href={DEVIS_URL} target="_blank" rel="noopener noreferrer">
            Demander un devis gratuit →
          </a>
        </p>
      </div>
    </div>
  );
}

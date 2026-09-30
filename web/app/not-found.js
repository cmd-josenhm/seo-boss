import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container narrow page-title" style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h1 style={{ fontSize: '3.4rem', margin: 0 }}>404</h1>
      <p>Cette page n’existe pas (ou plus). L’agent IA a peut-être déjà trouvé mieux !</p>
      <p style={{ marginTop: 24 }}>
        <Link href="/" className="btn">Retour à l’accueil</Link>
      </p>
    </div>
  );
}

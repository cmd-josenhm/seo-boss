import Link from 'next/link';
import { SITE, CATEGORIES, DEVIS_URL } from '@/lib/site';

export const metadata = {
  title: 'À propos',
  description: `Découvrez ${SITE.name} : notre mission, notre audience et notre méthode éditoriale.`,
  alternates: { canonical: '/a-propos' },
};

export default function AboutPage() {
  return (
    <div className="container narrow">
      <div className="page-head">
        <h1>À propos de {SITE.name}</h1>
        <p>
          Un média numérique francophone dédié à l&apos;audience africaine : jeunes, étudiants,
          freelances, commerçants et entrepreneurs.
        </p>
      </div>

      <div className="prose-card" style={{ marginTop: 24 }}>
        <h2>Notre mission</h2>
        <p>
          Rendre l&apos;information utile simple, actionnable et adaptée au terrain africain : vie
          spirituelle au quotidien, outils d&apos;IA gratuits, revenus en ligne, business locaux et
          réseaux sociaux. Chaque guide répond à une question concrète : « comment faire »,
          « combien ça coûte », « quelle alternative ».
        </p>

        <h2>Nos thématiques</h2>
        <ul>
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link href={`/category/${c.id}`}>{c.label}</Link> — {c.desc}
            </li>
          ))}
        </ul>

        <h2>Notre méthode éditoriale</h2>
        <p>
          Les contenus sont produits et enrichis en continu par notre agent IA open-source, puis
          conservés : <strong>aucun article publié n&apos;est supprimé</strong>, les nouveaux
          s&apos;ajoutent aux précédents. Les anciens guides sont mis à jour régulièrement
          (informations, liens, structure) afin de rester exacts et utiles.
        </p>

        <h2>Corrections et suggestions</h2>
        <p>
          Une information à corriger, un sujet à proposer ? Écrivez-nous depuis la page{' '}
          <Link href="/contact">Contact</Link> : les corrections sont traitées en priorité.
        </p>

        <h2>Création de sites web</h2>
        <p>
          Vous avez besoin d&apos;un site web, d&apos;un blog ou d&apos;une boutique en ligne ?{' '}
          <a href={DEVIS_URL} target="_blank" rel="noopener noreferrer">
            Demandez un devis gratuit
          </a>
          .
        </p>
      </div>
    </div>
  );
}

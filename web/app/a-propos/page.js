import { SITE } from '@/lib/site';

export const metadata = {
  title: 'À propos',
  description: `Découvrez ${SITE.name} : notre mission, notre audience et la façon dont notre agent IA produit des guides utiles pour l'Afrique.`,
  alternates: { canonical: '/a-propos' },
};

export default function AboutPage() {
  return (
    <div className="container narrow page-title">
      <h1>À propos de {SITE.name}</h1>
      <div className="content" style={{ marginTop: 18 }}>
        <p>
          <strong>{SITE.name}</strong> est un média numérique francophone dédié à l’audience
          africaine : jeunes, étudiants, freelances, commerçants et entrepreneurs qui veulent
          maîtriser le numérique pour améliorer leur quotidien.
        </p>
        <h2>Notre mission</h2>
        <p>
          Rendre l’information technique simple, actionnable et adaptée au terrain africain —
          mobile money, outils d’IA gratuits, revenus en ligne, business locaux et réseaux sociaux.
          Chaque guide répond à une question concrète : « comment faire », « combien ça coûte »,
          « quelle alternative ».
        </p>
        <h2>Un site amélioré en continu par l’IA</h2>
        <p>
          Nos contenus sont produits et optimisés par un <strong>agent IA open-source</strong>
          qui tourne 24h/24 : il identifie les recherches populaires en Afrique, rédige de nouveaux
          articles, met à jour les contenus existants, vérifie les scores SEO, crée les liens
          internes et publie automatiquement. Un tableau de bord permet de superviser et de
          intervenir à tout moment.
        </p>
        <h2>Notre promesse éditoriale</h2>
        <ul>
          <li>Des conseils applicables immédiatement, sans jargon inutile.</li>
          <li>Des exemples locaux (opérateurs, prix, villes africaines).</li>
          <li>La transparence : chaque article est daté et régulièrement révisé.</li>
          <li>Le respect de votre vie privée (mesure d’audience anonyme).</li>
        </ul>
      </div>
    </div>
  );
}

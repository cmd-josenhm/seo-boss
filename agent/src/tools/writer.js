/**
 * Rédacteur d'articles : LLM open-source si dispo, sinon générateur template local
 * qui produit des articles complets, cohérents et SPÉCIFIQUES À LA CATÉGORIE
 * (FAQ, points clés et conclusion propres à chaque pilier éditorial).
 */
import { completeJSON } from '../providers.js';
import { config } from '../config.js';
import { CATEGORIES, slugify } from './keywords.js';

const YEAR = new Date().getFullYear();

const SYSTEM = `Tu es un rédacteur SEO senior francophone spécialisé Afrique.
Tu écris pour le site BuzzAfrique (audience : jeunes et professionnels africains francophones).
Règles : français naturel, phrases courtes, ton utile et direct, exemples concrets
liés à l'Afrique (villes, opérateurs, prix en FCFA). Pas de fausses statistiques précises.
Sur les sujets de religion, reste factuel, respectueux et inclusif (aucune polémique).
Réponds UNIQUEMENT avec un objet JSON valide ayant exactement cette forme :
{
 "seo_title": "max 60 caractères, mot-clé devant",
 "slug": "kebab-case",
 "meta_description": "140-155 caractères avec mot-clé",
 "excerpt": "2 phrases (~150 caractères)",
 "category": "religion|ia|emploi|business|reseaux",
 "tags": ["5-8 mots-clés courts"],
 "content_md": "article Markdown 1000-1400 mots: ## titres H2, listes, tableau si utile, **conseils**, sans H1",
 "faq": [{"q": "question", "a": "réponse 40-60 mots"} x 5]
}`;

function mdLength(md) {
  return md.replace(/[#*`>\[\]()!-]/g, '').split(/\s+/).filter(Boolean).length;
}

/* ------------------------- Générateur template ------------------------- */
const TPL = {
  religion: {
    label: CATEGORIES.religion.label,
    intro: (k) =>
      `${cap(k)} occupe une place centrale dans la vie de millions de personnes en Afrique. Entre le travail, les études et la famille, trouver du temps et des outils fiables pour vivre sa foi n'est pas toujours simple. Ce guide pratique fait le tour de la question : organisation, applications gratuites, communauté et pièges à éviter.`,
    sections: (k) => [
      {
        h: `Pourquoi ${k} compte autant dans le quotidien`,
        p: `La pratique spirituelle structure la semaine : elle donne un rythme, un cadre et un réseau de soutien. Dans les grandes villes africaines, où l'on cumule souvent plusieurs activités, elle sert aussi de point d'équilibre. ${cap(k)} n'est donc pas un détail : c'est une habitude qui demande de l'organisation, un peu comme le sport ou l'épargne. La bonne nouvelle : quelques outils numériques suffisent pour tenir le rythme, même avec un emploi du temps chargé.`,
      },
      {
        h: `Comment s'organiser concrètement (méthode en 5 étapes)`,
        p: `1. **Fixez un créneau fixe** dans la semaine : même heure, même lieu — la régularité vaut mieux que la durée.\n2. **Bloquez une alerte** sur votre téléphone (rappelle-toi à 20h, mode silencieux activé).\n3. **Choisissez un support unique** : application, texte imprimé ou audio, pour éviter la dispersion.\n4. **Notez vos réflexions** dans un carnet ou une note du téléphone : c'est ce qui transforme une lecture en habitude.\n5. **Rejoignez un groupe** (physique ou WhatsApp) : l'engagement devant les autres multiplie la constance.`,
      },
      {
        h: `Les applications et outils gratuits qui aident vraiment`,
        p: `- **Lecture** : les applications de lecture (Bible, Coran, méditations) sont gratuites et fonctionnent souvent hors connexion — indispensable quand la data est limitée.\n- **Audio** : téléchargez les enseignements ou les récitations en Wi-Fi puis écoutez-les hors ligne pendant le transport.\n- **Rappels** : les alarmes et listes de tâches du téléphone suffisent, inutile de payer un abonnement.\n- **Groupes WhatsApp** : un fil dédié par groupe de prière ou d'étude, avec un message de synthèse hebdomadaire.\nAstuce data : privilégiez les versions audio compressées et téléchargez-les une fois par semaine plutôt que de diffuser en continu.`,
      },
      {
        h: `Participer à distance : culte, étude et communauté`,
        p: `Beaucoup de communautés diffusent désormais leurs rencontres en direct sur YouTube, Facebook ou Zoom. Pour que cela reste un moment de qualité et non une simple vidéo de plus : préparez votre espace (casque, téléphone en mode avion pour les notifications), prévoyez un temps d'échange après la diffusion et fixez une durée. Un groupe qui se retrouve en ligne chaque semaine garde une vraie cohésion s'il y a un animateur, un ordre du jour et un moment de discussion ouvert à tous.`,
      },
      {
        h: `Dons, offrandes et sécurité en ligne`,
        p: `Les dons par mobile money (Orange Money, MTN MoMo, Wave, M-Pesa) sont devenus courants. Quelques règles simples évitent les mauvaises surprises : vérifiez toujours le nom affiché avant de valider un transfert, refusez les demandes urgentes venues d'un compte inconnu, exigez un reçu même informel (capture d'écran du reçu opérateur), et ne communiquez jamais votre code secret — aucun responsable légitime ne vous le demandera. En cas de doute, passez par une personne identifiée de votre communauté plutôt que par un message privé.`,
      },
    ],
    alt: (k) =>
      `Selon votre situation, plusieurs approches de ${k} coexistent : en présentiel (lieu de culte, groupe de quartier), à distance (diffusion en direct, groupe WhatsApp) ou en solo (application, lecture personnelle). Le présentiel apporte la communauté et l'accompagnement ; le distanciel apporte la souplesse quand on travaille ou qu'on se déplace ; le format solo dépanne mais s'essouffle vite sans objectif. Le plus efficace reste une combinaison : un rendez-vous fixe en présentiel chaque semaine, un outil numérique pour le quotidien, et un groupe pour tenir la motivation.`,
    faq: (k) => [
      {
        q: `Faut-il une connexion internet payante ?`,
        a: `Non. Pour ${k}, la plupart des applications de lecture fonctionnent hors connexion après un premier téléchargement. Téléchargez vos contenus en Wi-Fi, puis utilisez-les en mode avion : vous économisez vos données mobiles et vous évitez les coupures.`,
      },
      {
        q: `Combien de temps faut-il consacrer à ${k} chaque jour ?`,
        a: `Mieux vaut 10 à 15 minutes tous les jours qu'une seule heure le week-end. Fixez un créneau stable, par exemple après le repas du soir ou au réveil, et tenez-le au moins trois semaines : c'est le temps nécessaire pour en faire une habitude.`,
      },
      {
        q: `Comment rejoindre un groupe quand on vit loin ou qu'on voyage ?`,
        a: `Beaucoup de communautés ont un groupe WhatsApp ou une diffusion en ligne. Demandez le lien à une personne de confiance, présentez-vous brièvement dans le groupe et proposez de participer à l'organisation (accueil, résumé de séance). La participation active remplace la proximité géographique.`,
      },
      {
        q: `Comment éviter les arnaques liées aux dons ?`,
        a: `Ne répondez jamais à une demande de don urgente envoyée par message privé, vérifiez le nom du destinataire avant de valider le transfert mobile money et demandez un reçu à l'opérateur. Aucun responsable légitime ne demande votre code secret ni votre mot de passe.`,
      },
      {
        q: `Les contenus en ligne peuvent-ils remplacer la communauté locale ?`,
        a: `Ils la complètent plutôt qu'ils ne la remplacent. Le direct et les applications aident à tenir un rythme quand on est occupé, malade ou en déplacement, mais la dimension humaine — être connu, conseillé et soutenu — passe par des relations régulières, en présentiel ou dans un petit groupe actif.`,
      },
    ],
    takeaways: () => [
      'Un créneau fixe chaque semaine bat un grand projet ponctuel.',
      'Téléchargez vos contenus en Wi-Fi : hors ligne, la data ne coûte rien.',
      'Un groupe (présentiel ou WhatsApp) multiplie la régularité.',
      'Vérifiez toujours le nom du destinataire avant un don en ligne.',
      'Aucun code secret ne se communique, même à un responsable.',
    ],
  },

  ia: {
    label: CATEGORIES.ia.label,
    intro: (k) =>
      `${cap(k)} permet aujourd'hui de rédiger, traduire, analyser ou créer des visuels en quelques secondes, gratuitement et depuis un téléphone Android ou iPhone. Ce guide pas à pas montre comment l'utiliser efficacement, même si vous partez de zéro.`,
    sections: (k) => [
      {
        h: `${cap(k)} : c'est quoi exactement ?`,
        p: `${cap(k)} regroupe des outils d'intelligence artificielle capables de comprendre et de générer du texte, des images ou des résumés. Pour un débutant, l'essentiel : vous écrivez une demande (un « prompt »), l'IA vous répond. Aucune connaissance technique n'est nécessaire. L'inscription se fait en 2 minutes avec une adresse e-mail, et la version gratuite suffit largement pour découvrir.`,
      },
      {
        h: `Premiers pas : démarrer en 4 minutes`,
        p: `1. Ouvrez le site officiel ou installez l'application.\n2. Créez un compte (e-mail ou numéro de téléphone).\n3. Posez une question simple pour tester : « Résume ce texte en 3 points ».\n4. Enregistrez vos conversations utiles dans un dossier pour y revenir.`,
      },
      {
        h: `5 cas d'usage qui changent vraiment le quotidien`,
        p: `- **CV et lettre de motivation** : demandez une correction professionnelle en français.\n- **Business** : rédigez une description de produit pour WhatsApp ou Jumia.\n- **Études** : faites expliquer une notion difficile avec un exemple concret.\n- **Traduction** : passez du français à l'anglais pour écrire sur les réseaux.\n- **Idées de contenu** : générez 10 titres de vidéos TikTok sur votre thématique.`,
      },
      {
        h: `Écrire un bon prompt (la compétence n°1)`,
        p: `Un prompt efficace contient 4 éléments : le rôle (« tu es un coach carrière »), la tâche (« écris une lettre »), le contexte (poste visé, pays, expérience) et le format (liste, tableau, 200 mots). Exemple : « Tu es un coach carrière à Douala. Écris une lettre de motivation de 150 mots pour un stage en comptabilité, ton formel. » Plus vous êtes précis, meilleure est la réponse. Itérez ensuite : demandez de raccourcir, d'ajouter des exemples, ou d'adapter le ton.`,
      },
      {
        h: `Limites et pièges à connaître`,
        p: `L'IA peut se tromper : vérifiez les faits, les prix et les lois avant de publier. Elle ne remplace pas votre expérience. Évitez de coller des données personnelles ou des mots de passe. Enfin, la version gratuite a parfois des limites d'utilisation aux heures de pointe : patientez quelques minutes ou reformulez plus tard.`,
      },
    ],
    alt: (k) =>
      `${cap(k)} comparé aux autres outils gratuits : ChatGPT, Gemini, Copilot et les assistants intégrés aux réseaux sociaux. Tous fonctionnent sur le même principe. Choisissez selon votre besoin : rédaction longue, analyse d'image ou intégration dans un navigateur. Rien ne vous empêche d'en utiliser deux : l'un pour écrire, l'autre pour vérifier. L'important est de créer une habitude : 15 minutes par jour suffisent pour devenir à l'aise.`,
    faq: (k) => [
      {
        q: `Les outils d'IA sont-ils vraiment gratuits ?`,
        a: `La version gratuite suffit pour apprendre et pour la plupart des usages quotidiens. Les offres payantes apportent surtout des modèles plus récents, des limites d'usage plus élevées et l'accès à des fonctions avancées (analyse de fichiers, génération d'images).`,
      },
      {
        q: `Combien de temps faut-il pour être à l'aise ?`,
        a: `Comptez 10 à 20 minutes pour créer un compte et faire vos premiers essais. Avec 15 minutes par jour pendant une semaine, vous maîtriserez déjà les cas d'usage essentiels de ${k} : rédaction, résumé, traduction et correction.`,
      },
      {
        q: `Est-ce disponible depuis l'Afrique avec une connexion limitée ?`,
        a: `Oui, les interfaces sont légères et fonctionnent sur un smartphone d'entrée de gamme. Privilégiez le mode texte, évitez les longs échanges avec images, et préparez vos demandes hors connexion avant de les envoyer.`,
      },
      {
        q: `Peut-on faire confiance aux réponses ?`,
        a: `Pas les yeux fermés. L'IA peut inventer des chiffres, des dates ou des sources. Traitez-la comme un assistant rapide : elle propose, vous vérifiez. Pour un prix, une loi ou une donnée de santé, contrôlez toujours auprès d'une source officielle.`,
      },
      {
        q: `Quels sont les risques à éviter ?`,
        a: `Ne partagez jamais de données personnelles (pièce d'identité, mot de passe, relevé bancaire). Méfiez-vous des applications non officielles qui promettent des « gains garantis » avec l'IA et des abonnements cachés.`,
      },
    ],
    takeaways: () => [
      'Un bon prompt = rôle + tâche + contexte + format.',
      'Vérifiez toujours les chiffres, prix et sources proposés.',
      '15 minutes par jour suffisent pour prendre l’habitude.',
      'Ne collez jamais de données personnelles dans un outil IA.',
      'La version gratuite couvre la majorité des besoins.',
    ],
  },

  emploi: {
    label: CATEGORIES.emploi.label,
    intro: (k) =>
      `${cap(k)} est une porte d'entrée sérieuse vers des revenus réguliers, sans diplôme d'ingénieur ni capital de départ. Ce guide détaille la méthode complète : profil, offres, tarifs, paiement et pièges à éviter.`,
    sections: (k) => [
      {
        h: `Le marché : comment ça marche concrètement`,
        p: `Il s'agit avant tout d'un marché où l'on échange des compétences contre de l'argent, à distance ou sur place. Les plateformes prennent une commission, mais le reste vous revient. Ce qui fait la différence : une offre claire, des exemples de réalisations et des délais tenus. Sans expérience, commencez par de petites missions simples (saisie, traduction, montage vidéo, community management) pour construire un portfolio.`,
      },
      {
        h: `Créer un profil qui attire les clients`,
        p: `1. **Titre précis** : « Rédacteur web FR/EN — niche fintech » plutôt que « expert en tout ».\n2. **Biographie orientée bénéfice** : ce que le client gagne à vous choisir.\n3. **3 réalisations** même gratuites (pour une association, un proche) avec captures.\n4. **Tarif d'appel** : regardez les prix du marché local puis positionnez-vous 10-15 % en dessous les premières semaines.\n5. **Temps de réponse** : répondre en moins d'une heure double vos chances.`,
      },
      {
        h: `Trouver ses premiers clients en 30 jours`,
        p: `- Jour 1-5 : complétez votre profil et envoyez 10 candidatures ciblées par jour.\n- Jour 6-15 : proposez une mini-offre d'essai à petit prix, livrée en 48 h.\n- Jour 16-25 : demandez un avis à chaque client satisfait (la preuve sociale attire le suivant).\n- Jour 26-30 : augmentez vos tarifs de 20 % pour les nouvelles missions.`,
      },
      {
        h: `Se faire payer sans friction`,
        p: `Les options classiques : virement bancaire, portefeuille mobile money (MTN MoMo, Orange Money, Wave), Wise ou PayPal selon le pays. Fixez la règle dès le départ : 50 % d'avance pour les projets longs. Gardez toutes les conversations sur la plateforme : c'est votre preuve en cas de litige. Facturez en début de mois pour les clients récurrents et suivez vos revenus dans un simple tableur.`,
      },
      {
        h: `Les 5 pièges qui font échouer les débutants`,
        p: `- Accepter tous les tarifs (vous vous épuisez sans progresser).\n- Travailler hors plateforme sans acompte.\n- Promettre des délais irréalistes.\n- Ne pas se spécialiser (le généraliste est remplaçable).\n- Ignorer la formation continue : 30 min/jour sur une compétence recherchée change tout en 3 mois.`,
      },
    ],
    alt: (k) =>
      `Parmi les options voisines de ${k} : création de contenu, vente en ligne et micro-tâches. Le contenu (vidéo, blog) rapporte à long terme mais demande de la régularité. La vente en ligne exige un petit capital de stock. Les micro-tâches rapportent peu mais paient vite. La meilleure stratégie : une activité principale qui paie dans le mois, plus un projet personnel (contenu ou boutique) qui grossit sur 6 à 12 mois.`,
    faq: (k) => [
      {
        q: `Faut-il un diplôme pour se lancer ?`,
        a: `Non, et c'est aussi vrai pour ${k} : les clients regardent d'abord les réalisations et la fiabilité. Un portfolio de trois travaux, même modestes, pèse plus qu'un diplôme non démontré. En revanche, une compétence précise (rédaction, montage, saisie, service client) est indispensable.`,
      },
      {
        q: `Combien de temps avant les premiers revenus ?`,
        a: `Avec 10 candidatures ciblées par jour, les premiers contrats arrivent généralement en deux à quatre semaines. Les premiers montants sont faibles : l'objectif des 30 premiers jours est d'obtenir des avis clients, pas de maximiser le revenu.`,
      },
      {
        q: `Comment se faire payer depuis l'Afrique ?`,
        a: `Selon votre pays et votre client : mobile money (Wave, Orange Money, MTN MoMo, M-Pesa), virement bancaire, Wise ou PayPal. Vérifiez les frais de retrait avant de fixer votre tarif, et demandez systématiquement un acompte de 50 % pour les missions longues.`,
      },
      {
        q: `Quels sont les pièges les plus fréquents ?`,
        a: `Le travail sans acompte hors plateforme, les délais irréalistes, le manque de spécialisation et les tarifs trop bas qui empêchent de vivre de l'activité. Un autre piège classique : ne jamais réclamer d'avis client, alors que c'est ce qui déclenche la mission suivante.`,
      },
      {
        q: `Peut-on travailler uniquement depuis un téléphone ?`,
        a: `Pour beaucoup de missions (community management, saisie, rédaction courte, service client), un smartphone récent suffit pour démarrer. Dès que vous visez des tarifs plus élevés, un ordinateur portable d'occasion devient l'investissement le plus rentable.`,
      },
    ],
    takeaways: () => [
      'Spécialisez-vous sur une compétence précise.',
      'Trois réalisations valent mieux qu’un long CV.',
      'Toujours 50 % d’acompte pour un projet long.',
      'Demandez un avis écrit à chaque client satisfait.',
      'Augmentez vos tarifs tous les 10 clients.',
    ],
  },

  business: {
    label: CATEGORIES.business.label,
    intro: (k) =>
      `Lancer un ${k} ne demande pas un gros capital : beaucoup de projets démarrent avec moins de 50 000 FCFA et un smartphone. Voici la méthode complète, de l'idée au premier client, avec des exemples adaptés au marché africain.`,
    sections: (k) => [
      {
        h: `Choisir une idée qui paie vraiment`,
        p: `Une bonne idée répond à un problème fréquent et urgent. Testez-la avant d'investir : publiez une photo du produit sur WhatsApp Status et Facebook, mesurez les réponses en 48 h, puis pré-vendez. Les niches qui marchent : restauration locale livrée, cosmétiques, revente de forfaits data, services de dépannage, formation en ligne. Évitez les idées « à la mode » sans client local identifié.`,
      },
      {
        h: `Business plan ultra-simple en 1 page`,
        p: `1. **Produit** : quoi, pour qui, à quel prix.\n2. **Coûts** : approvisionnement, transport, emballage, commission mobile money.\n3. **Volume** : combien de ventes pour couvrir les coûts ?\n4. **Canal** : WhatsApp, boutique physique, Jumia, TikTok.\n5. **Objectif 30 jours** : un chiffre unique et mesurable (ex. 60 ventes).`,
      },
      {
        h: `Vendre avec WhatsApp et les réseaux`,
        p: `- Créez un catalogue WhatsApp Business avec photos nettes et prix visibles.\n- Publiez 1 statut/jour : produit, avis client, coulisses.\n- Répondez en moins de 10 minutes aux heures du soir (18h-22h).\n- Utilisez TikTok pour montrer l'utilisation réelle du produit : une vidéo simple en lumière naturelle suffit.\n- Proposez la livraison le jour même : c'est le premier argument d'achat.`,
      },
      {
        h: `Gérer l'argent comme un pro`,
        p: `Séparez immédiatement le compte personnel et le compte business, même si ce sont deux numéros mobile money différents. Notez chaque entrée et sortie le jour même. Réinvestissez 30 % du bénéfice dans le stock, mettez 20 % de côté pour les imprévus et gardez une réserve d'un mois de charges. Les échecs les plus fréquents viennent d'une confusion des comptes, pas d'un manque de ventes.`,
      },
      {
        h: `Développer sans s'épuiser`,
        p: `Une fois 10 clients réguliers : automatisez (modèles de messages, stock minimum, livreur à la tâche), diversifiez légèrement (2 produits complémentaires maximum) et mesurez ce qui marche chaque semaine. Le passage de 10 à 100 clients se fait par le bouche-à-oreille et les avis : demandez systématiquement un retour après chaque vente et publiez-le.`,
      },
    ],
    alt: (k) =>
      `Existe-t-il des alternatives au ${k} ? L'affiliation (vendre le produit des autres) démarre sans stock. Le dropshipping évite la logistique mais réduit la marge. Le commerce physique rassure les clients mais coûte un loyer. En pratique, beaucoup d'entrepreneurs africains combinent : WhatsApp pour vendre, une place de marché pour la visibilité, TikTok pour l'attractivité. Choisissez un canal principal, maîtrisez-le, puis étendez.`,
    faq: (k) => [
      {
        q: `Quel capital minimum pour démarrer ?`,
        a: `Pour ${k}, on peut démarrer avec 25 000 à 50 000 FCFA si l'on vend d'abord sur commande, sans stock. La règle : n'investissez dans le stock qu'après avoir encaissé des pré-ventes. Le smartphone et une connexion suffisent au départ.`,
      },
      {
        q: `Combien de temps avant d'être rentable ?`,
        a: `Pour un petit commerce de proximité ou de revente, la rentabilité arrive souvent entre 1 et 3 mois, à condition de suivre ses marges chaque semaine. Si un produit n'atteint pas 20 % de marge nette, remplacez-le rapidement.`,
      },
      {
        q: `Faut-il une société pour commencer ?`,
        a: `Pas pour tester : vous pouvez commencer en nom propre et vous formaliser quand le chiffre d'affaires devient régulier. Se déclarer permet d'accéder aux paiements professionnels, aux marchés et aux crédits fournisseurs.`,
      },
      {
        q: `Comment gérer les impayés et les clients difficiles ?`,
        a: `Exigez un acompte de 30 à 50 % pour toute commande personnalisée, confirmez le prix et le délai par écrit (WhatsApp suffit) et livrez uniquement après paiement complet. Un client qui refuse l'acompte est un risque à éviter.`,
      },
      {
        q: `Quelles erreurs tuent les jeunes entreprises ?`,
        a: `Mélanger l'argent personnel et professionnel, vendre sans marge suffisante pour absorber les pertes, ignorer les frais de livraison et négliger le suivi client. Notez vos chiffres chaque semaine : ce qui n'est pas mesuré ne s'améliore pas.`,
      },
    ],
    takeaways: () => [
      'Pré-vendez avant d’investir dans le stock.',
      'Séparez l’argent personnel et l’argent business.',
      'Une marge nette inférieure à 20 % n’est pas tenable.',
      'Répondez en moins de 10 minutes aux heures de pointe.',
      'Chaque vente doit produire un avis client.',
    ],
  },

  reseaux: {
    label: CATEGORIES.reseaux.label,
    intro: (k) =>
      `Maîtriser ${k} peut transformer un compte personnel en source de revenus : publiez régulièrement, comprenez l'algorithme et convertissez l'audience en opportunités. Ce guide pratique résume l'essentiel en ${YEAR}.`,
    sections: (k) => [
      {
        h: `Comment fonctionne l'algorithme`,
        p: `L'algorithme privilégie le temps passé, les commentaires et les partages. Au début, la vidéo est montrée à un petit groupe test : si cette audience réagit bien, elle est diffusée plus largement. D'où l'importance des 3 premières secondes et d'un appel à l'action clair (« dis-moi ton avis en commentaire »). La régularité compte plus que la perfection : 4 publications par semaine battent 1 vidéo parfaite par mois.`,
      },
      {
        h: `La méthode de contenu en 4 étapes`,
        p: `1. **Observer** : sauvegardez 10 contenus viraux de votre niche et notez leur accroche.\n2. **Décliner** : reprenez l'angle avec votre expérience et votre voix.\n3. **Produire** : filmez 3 vidéos d'un coup, en lumière naturelle, son clair.\n4. **Analyser** : chaque semaine, gardez les 2 formats les plus vus et abandonnez les autres.`,
      },
      {
        h: `Publier au bon moment en Afrique`,
        p: `Les pics de fréquentation se situent souvent entre 12h-14h et 18h-22h, heure locale de votre audience principale. Le meilleur jour pour tester : le dimanche soir. Utilisez les fonctionnalités à la mode (filtres, sons tendance) dans les 48 h de leur apparition. Répondez aux commentaires pendant la première heure : cela relance la diffusion.`,
      },
      {
        h: `Gagner de l'argent : les modèles qui fonctionnent`,
        p: `- Partenariats de marque (à partir d'une audience engagée, même petite et locale).\n- Affiliation de produits utiles à votre communauté.\n- Vente de votre propre service (formation, coaching, produit).\n- Programme de créateur ou fonds d'aide de la plateforme.\nLa règle : choisissez UN modèle principal et alignez vos contenus dessus, sans spammer les liens.`,
      },
      {
        h: `Erreurs qui tuent la croissance`,
        p: `- Acheter des abonnés (l'algorithme détecte l'inactivité).\n- Changer de niche toutes les semaines.\n- Ignorer les commentaires.\n- Republier sans autorisation le contenu d'une autre plateforme.\n- Publier sans objectif : chaque contenu doit pousser vers l'action suivante (abonnement, clic, message).`,
      },
    ],
    alt: (k) =>
      `${cap(k)} face aux autres plateformes : TikTok pousse vite les nouveaux comptes, Instagram récompense la qualité visuelle, YouTube rémunère sur la durée et Facebook domine encore pour les communautés adultes en Afrique. Plutôt que d'être partout, choisissez la plateforme où se trouve votre audience, maîtrisez son format natif, puis déclinez le même message ailleurs en 10 minutes.`,
    faq: (k) => [
      {
        q: `Combien de publications faut-il par semaine ?`,
        a: `Visez 3 à 4 publications par semaine, à heure régulière. La constance pèse plus que le volume : mieux vaut un rythme tenable sur trois mois qu'une semaine intensive suivie de deux semaines d'absence.`,
      },
      {
        q: `Peut-on se développer sans montrer son visage ?`,
        a: `Oui, avec des formats sans visage : captures d'écran commentées, voix off, textes animés, tutoriels d'écran. Ces formats fonctionnent bien pour les tutoriels et les comparatifs, mais le visage crée généralement plus de confiance et de partenariats.`,
      },
      {
        q: `Quand les premières rémunérations arrivent-elles ?`,
        a: `Les programmes de créateurs demandent un seuil d'abonnés et d'heures visionnées. Les premiers revenus viennent souvent plus tôt de l'affiliation ou d'une prestation vendue à votre communauté (community management, montage, formation courte).`,
      },
      {
        q: `Comment gérer les commentaires négatifs ?`,
        a: `Répondez brièvement et factuellement aux critiques légitimes, ignorez les provocations, et bloquez les insultes répétées. Ne supprimez pas une critique honnête : une réponse calme rassure les autres lecteurs plus qu'elle ne vous dessert.`,
      },
      {
        q: `Faut-il acheter des abonnés ou de la publicité ?`,
        a: `N'achetez jamais d'abonnés : vous obtiendrez une audience inactive qui pénalise la diffusion. En revanche, une petite campagne publicitaire ciblée (5 000 FCFA) sur un contenu qui performe déjà peut accélérer la croissance de façon saine.`,
      },
    ],
    takeaways: () => [
      'Les 3 premières secondes décident de la diffusion.',
      '3 à 4 publications par semaine, à heure fixe.',
      'Répondez aux commentaires dans la première heure.',
      'N’achetez jamais d’abonnés.',
      'Un seul modèle de revenu à la fois, appliqué partout.',
    ],
  },
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const lower = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** coupe à une limite en respectant les mots */
const clip = (s, n) => {
  s = String(s);
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const i = cut.lastIndexOf(' ');
  return (i > n * 0.6 ? cut.slice(0, i) : cut).trim();
};

/** Choisit le titre le plus long possible SANS coupure au milieu d'un mot. */
function pickTitle(keyword, variants, max = 62) {
  const fits = variants.find((v) => v.length <= max);
  if (fits) return fits;
  return clip(variants.reduce((a, b) => (a.length <= b.length ? a : b)), max);
}

/**
 * Sujet « parlant » : retire un suffixe d'intention collé au mot-clé
 * (« comment prier au Sénégal : guide pratique » -> « comment prier au Sénégal »).
 * On conserve le suffixe s'il porte un marché (… : guide complet au Cameroun).
 */
export function topicOf(keyword) {
  const i = keyword.indexOf(':');
  if (i > 0) {
    const tail = keyword.slice(i + 1);
    if (!/\b(au|aux|en|d'|du|de la|des)\b/i.test(tail)) return keyword.slice(0, i).trim();
  }
  return keyword.trim();
}

/** Forme nominale (pour les titres de section) : « comment prier » -> « prier ». */
export function nounOf(keyword) {
  return topicOf(keyword)
    .replace(/^(comment|pourquoi|quand|où|combien coûte|combien coûtent|quel est le meilleur|quelle est la meilleure|est-ce que)\s+/i, '')
    .replace(/\s+(est[- ]ce que|sont[- ]ils|faut[- ]il).*$/i, '')
    .trim();
}

function templateArticle(task) {
  const keyword = task.keyword;
  const cat = TPL[task.category] ? task.category : 'business';
  const def = TPL[cat];
  const label = def.label || CATEGORIES[cat]?.label || 'Général';
  const slug = task.slug || slugify(keyword);

  // « keyword » = mot-clé SEO complet (titre, meta, slug, tags)
  // « topic »   = sujet lisible dans une phrase (« comment prier au Sénégal »)
  // « noun »    = forme nominale pour les titres de section (« prier au Sénégal »)
  const topic = topicOf(keyword);
  const noun = nounOf(keyword) || topic;

  // Titre : on n'ajoute un suffixe que s'il tient entièrement dans la limite,
  // et jamais après un « : » déjà présent dans le mot-clé.
  const seoTitle = pickTitle(keyword, [
    cap(topic),
    `${cap(noun)} (guide ${YEAR})`,
    `${cap(noun)} : le guide ${YEAR}`,
    `${cap(noun)} : l'essentiel`,
  ], 65);

  const meta = clip(
    `${cap(topic)} : guide pratique ${YEAR}. Étapes, conseils et erreurs à éviter pour réussir, avec des exemples adaptés au contexte africain.`,
    155
  );

  const content = [
    def.intro(noun),
    ...def.sections(noun).map((s) => `## ${s.h}\n\n${s.p}`),
    `## ${cap(noun)} : alternatives et comparatif\n\n${def.alt(noun)}`,
    `## Points clés à retenir\n\n${def.takeaways(noun).map((t) => `- ${t}`).join('\n')}`,
    `## Conclusion\n\n${cap(noun)} récompense la régularité plus que les grands projets ponctuels. Appliquez une seule action de ce guide dès cette semaine, mesurez le résultat, puis ajustez. Retrouvez d'autres guides pratiques dans la catégorie ${label} sur BuzzAfrique.`,
  ].join('\n\n');

  return {
    seo_title: seoTitle,
    slug,
    meta_description: meta,
    excerpt: clip(
      `${cap(topic)} : ce qu'il faut savoir en ${YEAR}, étape par étape, avec les erreurs à éviter et des conseils concrets adaptés au contexte africain.`,
      200
    ),
    category: cat,
    tags: [...new Set([keyword.split(' ')[0], ...(label.split(' ')[0] ? [label.split(' ')[0]] : []), 'afrique', 'guide', String(YEAR)].map((t) => t.trim().toLowerCase()))],
    content_md: content,
    faq: def.faq(topic),
  };
}

/** Rédige un article complet pour une tâche. */
export async function writeArticle(task) {
  let data = null;
  let provider = 'template';

  const user = `Écris un article SEO optimisé pour ce mot-clé :
Mot-clé principal : "${task.keyword}"
Catégorie suggérée : ${task.category}
Slug : ${task.slug || slugify(task.keyword)}
Langue : ${config.lang}`;

  const llm = await completeJSON(SYSTEM, user);
  if (llm.json && llm.json.content_md && mdLength(llm.json.content_md) >= 500) {
    data = llm.json;
    provider = llm.provider;
  }
  if (!data) data = templateArticle(task);

  const slug = slugify(data.slug || task.slug || task.keyword);
  const content_md = String(data.content_md || '').trim();
  const wordCount = mdLength(content_md);

  return {
    slug,
    title: clip(data.seo_title || data.title || task.keyword, 70),
    excerpt: String(data.excerpt || '').slice(0, 220),
    meta_description: clip(data.meta_description || data.excerpt || '', 160),
    category: TPL[data.category] ? data.category : task.category || 'business',
    tags: Array.isArray(data.tags) ? data.tags.slice(0, 8) : [],
    keywords: [task.keyword],
    faq: Array.isArray(data.faq) ? data.faq.slice(0, 6) : [],
    content_md,
    word_count: wordCount,
    status: config.autoPublish ? 'published' : 'draft',
    source: 'agent',
    lang: config.lang,
    author: 'BuzzAfrique',
    _provider: provider,
  };
}

export { TPL, lower };

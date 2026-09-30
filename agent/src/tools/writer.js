/**
 * Rédacteur d'articles : LLM open-source si dispo, sinon générateur template
 * local qui produit quand même des articles complets et cohérents (FR).
 */
import { completeJSON } from '../providers.js';
import { config } from '../config.js';
import { CATEGORIES, slugify } from './keywords.js';

const YEAR = new Date().getFullYear();

const SYSTEM = `Tu es un rédacteur SEO senior francophone spécialisé Afrique.
Tu écris pour le site BuzzAfrique (audience : jeunes et professionnels africains francophones).
Règles : français naturel, phrases courtes, ton utile et direct, exemples concrets
liés à l'Afrique (opérateurs, prix en FCFA, villes). Pas de fausses statistiques précises.
Réponds UNIQUEMENT avec un objet JSON valide ayant exactement cette forme :
{
 "seo_title": "max 60 caractères, mot-clé devant",
 "slug": "kebab-case",
 "meta_description": "140-155 caractères avec mot-clé",
 "excerpt": "2 phrases (~150 caractères)",
 "category": "fintech|ia|emploi|business|reseaux",
 "tags": ["5-8 mots-clés courts"],
 "content_md": "article Markdown 1000-1400 mots: ## titres H2, listes, tableau si utile, **conseils**, sans H1",
 "faq": [{"q": "question", "a": "réponse 40-60 mots"} x 5]
}`;

function mdLength(md) {
  return md.replace(/[#*`>\[\]()!-]/g, '').split(/\s+/).filter(Boolean).length;
}

/* ------------------------- Générateur template ------------------------- */
const TPL = {
  fintech: {
    intro: (k) => `Le ${k} s'impose aujourd'hui comme l'une des solutions les plus utilisées par les Africains pour effectuer des paiements, recevoir de l'argent et gérer leur quotidien sans se déplacer en agence. Ce guide vous explique tout, étape par étape, avec des conseils concrets pour bien démarrer.`,
    sections: (k) => [
      { h: `Qu'est-ce que ${k} et à qui s'adresse-t-il ?`, p: `${k} est une solution numérique accessible depuis un simple téléphone, même avec une connexion limitée. Elle s'adresse aux étudiants, aux travailleurs indépendants, aux commerçants et à toute personne qui veut gagner du temps. Contrairement aux méthodes classiques, l'inscription se fait en quelques minutes, souvent directement dans une application ou au point de vente le plus proche. Avant de commencer, vérifiez que votre numéro de téléphone est actif et que vous avez une pièce d'identité à portée de main : c'est obligatoire pour la vérification.` },
      { h: `Pourquoi ${k} connaît un tel succès en Afrique`, p: `Trois raisons expliquent la popularité croissante : la faible pénétration des cartes bancaires classiques, le coût élevé des agences bancaires traditionnelles et la nécessité d'envoyer de l'argent rapidement à la famille. Avec ${k}, les frais sont généralement plus bas, les opérations sont instantanées et tout se contrôle depuis le téléphone. Les commerçants y gagnent aussi : plus besoin de gérer la monnaie poche, les encaissements sont traçables.` },
      { h: `Comment utiliser ${k} en 5 étapes`, p: `1. **Téléchargez l'application** officielle depuis le Play Store ou l'App Store, ou composez le code USSD indiqué par l'opérateur.\n2. **Créez votre compte** avec votre numéro de téléphone et vérifiez-le par code reçu par SMS.\n3. **Complétez l'identification** (nom complet, pièce d'identité) pour débloquer les plafonds élevés.\n4. **Approvisionnez votre compte** depuis une agence, une carte bancaire ou un autre utilisateur.\n5. **Effectuez votre premier paiement** : entrez le numéro du destinataire, montant, puis validez avec votre code secret. Gardez toujours ce code pour vous.` },
      { h: `Frais, plafonds et délais : ce qu'il faut savoir`, p: `Les frais dépendent du montant transféré et du pays. En général, transferir de l'argent vers un proche coûte moins cher qu'un virement bancaire classique, et l'opération est quasi instantanée. Attention aux plafonds journaliers : sans identification complète, vous serez limité. Astuce : comparez toujours le montant reçu par le destinataire avant de valider, et utilisez le Wi-Fi ou une connexion stable pour éviter les transactions interrompues.` },
      { h: `Sécurité : les 6 erreurs à éviter`, p: `- Ne **jamais** partager votre code PIN, même avec un « agent » qui appelle.\n- Méfiez-vous des arnaques « gain garanti » qui demandent un paiement d'avance par ${k}.\n- Vérifiez le nom affiché avant de valider un transfert.\n- Activez les alertes SMS sur chaque opération.\n- Utilisez uniquement l'application officielle.\n- En cas de doute, bloquez temporairement la carte ou le compte depuis l'application.` },
    ],
    alt: (k) => `${k} face aux alternatives : mobile money classique, banque en ligne et portefeuilles crypto. Le mobile money reste le plus simple pour un usage quotidien car il fonctionne sans carte bancaire. La banque en ligne apporte davantage de services (épargne, chéquier) mais exige des justificatifs. Les crypto-monnaies intéressent surtout les freelances qui reçoivent des paiements internationaux, mais le cours varie beaucoup. Pour un débutant, commencez par ${k}, puis ajoutez une banque en ligne dès que vos revenus réguliers le permettent.`,
  },
  ia: {
    intro: (k) => `${k} permet aujourd'hui de rédiger, traduire, analyser ou créer des visuels en quelques secondes, gratuitement et depuis un téléphone Android ou iPhone. Ce guide pas à pas montre comment l'utiliser efficacement, même si vous partez de zéro.`,
    sections: (k) => [
      { h: `${k} : c'est quoi exactement ?`, p: `${k} regroupe des outils d'intelligence artificielle capables de comprendre et de générer du texte, des images ou des résumés. Pour un débutant, l'essentiel : vous écrivez une demande (un « prompt »), l'IA vous répond. Aucune connaissance technique n'est nécessaire. L'inscription se fait en 2 minutes avec une adresse e-mail, et la version gratuite suffit largement pour découvrir.` },
      { h: `Premiers pas : démarrer en 4 minutes`, p: `1. Ouvrez le site officiel ou installez l'application.\n2. Créez un compte (e-mail ou numéro de téléphone).\n3. Posez une question simple pour tester : « Résume ce texte en 3 points ».\n4. Enregistrez vos conversations utiles dans un dossier pour y revenir.` },
      { h: `5 cas d'usage qui changent vraiment le quotidien`, p: `- **CV et lettre de motivation** : demandez une correction professionnelle en français.\n- **Business** : rédiger une description de produit pour WhatsApp ou Jumia.\n- **Études** : expliquer une notion difficile avec un exemple concret.\n- **Traduction** : français vers anglais pour écrire sur les réseaux.\n- **Idées de contenu** : 10 titres de vidéos TikTok sur votre thématique.` },
      { h: `Écrire un bon prompt (la compétence n°1)`, p: `Un prompt efficace contient 4 éléments : le rôle (« tu es un coach carrière »), la tâche (« écris une lettre »), le contexte (poste visé, pays, expérience) et la format (liste, tableau, 200 mots). Exemple : « Tu es un coach carrière à Douala. Écris une lettre de motivation de 150 mots pour un stage en comptabilité, ton formel. » Plus vous êtes précis, meilleure est la réponse. Itérez : demandez à l'IA de raccourcir, d'ajouter des exemples, ou d'adapter au ton africain professionnel.` },
      { h: `Limites et pièges à connaître`, p: `L'IA peut se tromper : vérifiez les faits, les prix et les lois avant de publier. Elle ne remplace pas votre expérience. Évitez de coller des données personnelles ou des mots de passe. Enfin, la version gratuite a parfois des limites d'utilisation aux heures de pointe : patientez quelques minutes ou reformulez plus tard.` },
    ],
    alt: (k) => `${k} comparé aux autres outils gratuits : ChatGPT, Gemini, Copilot et les assistants intégrés aux réseaux sociaux. Tous fonctionnent sur le même principe. Choisissez selon votre besoin : rédaction longue, analyse d'image, ou intégration dans un navigateur. Rien ne vous empêche d'en utiliser deux : l'un pour écrire, l'autre pour vérifier. L'important est de créer une habitude : 15 minutes par jour suffisent pour devenir à l'aise.`,
  },
  emploi: {
    intro: (k) => `Le ${k} est une porte d'entrée sérieuse vers des revenus réguliers, sans diplôme d'ingénieur ni capital de départ. Ce guide détaille la méthode complète : profil, offres, tarifs, paiement et pièges à éviter.`,
    sections: (k) => [
      { h: `Comprendre comment fonctionne le ${k}`, p: `Il s'agit avant tout d'un marché où l'on échange des compétences contre de l'argent, à distance ou sur place. Les plateformes prennent une commission, mais le reste vous revient. Ce qui fait la différence : une offre claire, des exemples de réalisations et des délais tenus. Sans expérience, commencez par des petites missions simples (saisie, traduction, montage vidéo, community management) pour construire un portfolio.` },
      { h: `Créer un profil qui attire les clients`, p: `1. **Titre précis** : « Rédacteur web FR/EN — niche fintech » plutôt que « expert en tout ».\n2. **Biographie orientée bénéfice** : ce que le client gagne à vous choisir.\n3. **3 réalisations** même gratuites (pour un association, un proche) avec captures.\n4. **Tarif d'appel** : regardez les prix du marché local puis positionnez-vous 10-15 % en dessous les premières semaines.\n5. **Temps de réponse** : répondre en moins d'une heure double vos chances.` },
      { h: `Trouver ses premiers clients en 30 jours`, p: `- Jour 1-5 : complétez votre profil et envoyez 10 candidatures ciblées par jour.\n- Jour 6-15 : proposez une mini-offre d'essai à petit prix, livrée en 48 h.\n- Jour 16-25 : demandez un avis à chaque client satisfait (le social proof attire le suivant).\n- Jour 26-30 : augmentez vos tarifs de 20 % pour les nouvelles missions.` },
      { h: `Se faire payer sans friction`, p: `Les options classiques : virement bancaire, portefeuille mobile money (MTN MoMo, Orange Money, Wave), Wise ou PayPal selon le pays. Fixez la règle dès le départ : 50 % d'avance pour les projets longs. Gardez toutes les conversations sur la plateforme : c'est votre preuve en cas de litige. Facturez en début de mois pour les clients récurrents, et suivez vos revenus dans un simple tableur.` },
      { h: `Les 5 pièges qui font échouer les débutants`, p: `- Accepter tous les tarifs (vous vous épuisez sans progresser).\n- Travailler hors plateforme sans acompte.\n- Promettre des délais irréalistes.\n- Ne pas se spécialiser (le généraliste est remplaçable).\n- Ignorer la formation continue : 30 min/jour sur une compétence recherchée change tout en 3 mois.` },
    ],
    alt: (k) => `Parmi les options voisines du ${k} : création de contenu, vente en ligne et micro-tâches. Le contenu (vidéo, blog) rapporte à long terme mais demande de la régularité. La vente en ligne demande un petit capital stock. Les micro-tâches rapportent peu mais paient vite. La meilleure stratégie : une activité principale qui paie dans le mois, plus un projet personnel (contenu ou boutique) qui grossit sur 6 à 12 mois.`,
  },
  business: {
    intro: (k) => `Lancer un ${k} ne demande pas un gros capital : beaucoup de projets démarrent avec moins de 50 000 FCFA et un smartphone. Voici la méthode complète, de l'idée au premier client, avec des exemples adaptés au marché africain.`,
    sections: (k) => [
      { h: `Choisir une idée qui paie vraiment`, p: `Une bonne idée répond à un problème fréquent et urgent. Testez-la avant d'investir : publiez une photo du produit sur WhatsApp Status et Facebook, mesurez les réponses en 48 h, puis pré-vendez. Les niches qui marchent : restauration locale livrée, cosmétiques, revente de data/forfaits, services de dépannage, formation en ligne. Évitez les idées « à la mode » sans client local identifié.` },
      { h: `Business plan ultra-simple en 1 page`, p: `1. **Produit** : quoi, pour qui, à quel prix.\n2. **Coûts** : approvisionnement, transport, emballage, commission mobile money.\n3. **Volume** : combien de ventes pour couvrir les coûts ?\n4. **Canal** : WhatsApp, boutique physique, Jumia, TikTok.\n5. **Objectif 30 jours** : un chiffre unique et mesurable (ex. 60 ventes).` },
      { h: `Vendre avec WhatsApp et les réseaux`, p: `- Créez un catalogue WhatsApp Business avec photos nettes et prix visibles.\n- Publiez 1 statut/jour : produit, avis client, coulisses.\n- Répondez en moins de 10 minutes aux heures du soir (18h-22h).\n- Utilisez TikTok pour montrer l'utilisation réelle du produit : une vidéo simple en lumière naturelle suffit.\n- Proposez la livraison le jour même : c'est le premier argument d'achat.` },
      { h: `Gérer l'argent comme un pro`, p: `Séparez immédiatement le compte personnel et le compte business, même si ce sont deux numéros mobile money différents. Notez chaque entrée et sortie le jour même. Réinvestissez 30 % du bénéfice dans le stock, mettez 20 % de côté pour les imprévus, et gardez une réserve de 1 mois de charges. Les échecs les plus fréquents viennent d'une confusion des comptes, pas d'un manque de ventes.` },
      { h: `Développer sans s'épuiser`, p: `Une fois 10 clients réguliers : automatisez (modèles de messages, stock minimum, livreur à la tâche), diversifiez légèrement (2 produits complémentaires maximum) et mesurez ce qui marche chaque semaine. Le passage de 10 à 100 clients se fait par le bouche-à-oreille et les avis : demandez systématiquement un retour après chaque vente et publiez-le.` },
    ],
    alt: (k) => `Existe-t-il des alternatives au ${k} ? Le affiliation (vendre le produit des autres) démarre sans stock. Le dropshipping évite la logistique mais réduit la marge. Le commerce physique rassure les clients mais coûte un loyer. En pratique, beaucoup de entrepreneurs africains combinent : WhatsApp pour vendre, une place de marché pour la visibilité, et TikTok pour l'attirance. Choisissez un canal principal, maîtrisez-le, puis étendez.`,
  },
  reseaux: {
    intro: (k) => `Maîtriser ${k} peut transformer un compte personnel en source de revenus : publies régulièrement, comprends l'algorithme et transforme l'audience en opportunités. Ce guide pratique résume l'essentiel en 2026.`,
    sections: (k) => [
      { h: `Comment fonctionne l'algorithme de ${k}`, p: `L'algorithme privilégie le temps passé, les commentaires et les partages. Au début, la vidéo est montrée à un petit groupe test : si cette audience réagit bien, elle est diffusée plus largement. D'où l'importance des 3 premières secondes et d'un appel à l'action clair (« dis-moi ton avis en commentaire »). La régularité compte plus que la perfection : 4 publications par semaine battent 1 vidéo parfaite par mois.` },
      { h: `La méthode de contenu en 4 étapes`, p: `1. **Observer** : sauvegardez 10 contenus viraux de votre niche et notez leur accroche.\n2. **Décliner** : reprenez l'angle avec votre expérience et votre voix.\n3. **Produire** : filmez 3 vidéos d'un coup, en lumière naturelle, son clair.\n4. **Analyser** : chaque semaine, gardez les 2 formats les plus vus et abandonnez les autres.` },
      { h: `Publier au bon moment en Afrique`, p: `Les pics de fréquentation se situent souvent entre 12h-14h et 18h-22h, heure locale de votre audience principale. Le meilleur jour pour tester : le dimanche soir. Utilisez les fonctionnalités à la mode (filtres, sons tendance) dans les 48 h de leur apparition. Répondez aux commentaires pendant la première heure : cela relance la diffusion.` },
      { h: `Gagner de l'argent avec ${k}`, p: `- Partenariats marques (à partir d'une audience engagée, même petite et locale).\n- Affiliation de produits utiles à votre communauté.\n- Vente de votre propre service (formation, coaching, produit).\n- Programme de créateur / fonds d'aide de la plateforme.\nLa règle : choisissez UN modèle principal et alignez vos contenus dessus, sans spammer les liens.` },
      { h: `Erreurs qui tuent la croissance`, p: `- Acheter des abonnés (l'algorithme détecte l'inactivité).\n- Changer de niche toutes les semaines.\n- Ignorer les commentaires.\n- Republier sans watermark d'une autre plateforme.\n- Publier sans objectif : chaque contenu doit pousser vers l'action suivante (abonnement, clic, message).` },
    ],
    alt: (k) => `${k} face aux autres plateformes : TikTok pousse vite les nouveaux comptes, Instagram récompense la qualité visuelle, YouTube rémunère sur la durée et Facebook domine encore pour les communautés adultes en Afrique. Plutôt que d'être partout, choisissez la plateforme où SE TROUVE votre client, maîtrisez son format natif, puis déclinez le même message ailleurs en 10 minutes.`,
  },
};

function templateArticle(task) {
  const keyword = task.keyword;
  const cat = TPL[task.category] ? task.category : 'business';
  const def = TPL[cat];
  const label = CATEGORIES[cat]?.label || 'General';
  const slug = task.slug || slugify(keyword);

  const titleOptions = [
    `${capitalize(keyword)} : le guide complet ${YEAR}`,
    `${capitalize(keyword)} : méthode pas à pas (testé en ${YEAR})`,
    `${capitalize(keyword)} : tout savoir avant de commencer`,
    `${capitalize(keyword)} : avantages, tarifs et astuces ${YEAR}`,
  ];
  const seoTitle = clip(titleOptions[slug.length % titleOptions.length], 65);
  const meta = clip(`${capitalize(keyword)} : guide pratique ${YEAR}. Étapes, tarifs, conseils et erreurs à éviter pour réussir vite en Afrique.`, 155);

  const sections = def.sections(keyword);
  const faq = [
    { q: `${capitalize(keyword)} : est-ce vraiment gratuit ?`, a: `La découverte et les fonctions de base sont gratuites dans la plupart des cas. Des frais peuvent s'appliquer selon le montant, l'opérateur ou l'option choisie. Vérifiez toujours la grille tarifaire officielle avant d'engager une dépense importante.` },
    { q: `Combien de temps faut-il pour démarrer avec ${keyword} ?`, a: `Comptez 10 à 20 minutes pour la création du compte et la vérification. La première utilisation complète se fait le jour même. Préparez votre numéro de téléphone, une pièce d'identité et une connexion stable pour éviter les interruptions.` },
    { q: `Est-ce disponible dans toute l'Afrique ?`, a: `La disponibilité dépend du pays et de l'opérateur. Les grands marchés (Cameroun, Sénégal, Côte d'Ivoire, Nigeria, Kenya, Ghana) sont en général couverts. Si votre pays n'est pas listé, recherchez l'alternative locale la plus proche dans notre comparatif.` },
    { q: `Quels sont les principaux risques ?`, a: `Les risques courants : partage du code PIN, arnaques « gains faciles » et applications non officielles. Utilisez uniquement le site ou l'application officielle, ne divulez jamais votre code et activez les alertes de transaction pour repérer toute activité suspecte.` },
    { q: `Quelle est la meilleure alternative si ${keyword} ne fonctionne pas ?`, a: `Selon votre pays, les options mobile money d'un autre opérateur, une banque en ligne ou un wallet régional font le même travail. Choisissez selon les frais, la couverture réseau et la simplicité de retrait près de chez vous.` },
  ];

  const content = [
    def.intro(keyword),
    ...sections.map((s) => `## ${s.h}\n\n${s.p}`),
    `## ${capitalize(keyword)} : alternatives et comparatif\n\n${def.alt(keyword)}`,
    `## Points clés à retenir\n\n- Vérifiez votre éligibilité avant de vous inscrire.\n- Commencez petit, augmentez progressivement.\n- Sécurisez votre compte (code PIN, alertes).\n- Comparez les frais aux alternatives locales.\n- Testez avec un montant minime la première fois.`,
    `## Conclusion\n\n${capitalize(keyword)} n'a rien de magique : c'est une méthode qui récompense la régularité et la prudence. Appliquez les étapes ci-dessus cette semaine, commencez par un test à petite échelle et mesurez les résultats. Retrouvez d'autres guides pratiques dans la catégorie ${label} sur BuzzAfrique.`,
  ].join('\n\n');

  return {
    seo_title: seoTitle,
    slug,
    meta_description: meta,
    excerpt: clip(`${capitalize(keyword)} : tout comprendre en ${YEAR} (étapes, tarifs, sécurité). Guide pratique pour réussir vite, adapté au marché africain.`, 200),
    category: cat,
    tags: [keyword.split(' ')[0], label.split(' ')[0].toLowerCase(), 'afrique', 'guide', ` ${YEAR}`].map((t) => t.trim().toLowerCase()),
    content_md: content,
    faq,
  };
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** coupe à une limite en respectant les mots */
const clip = (s, n) => {
  s = String(s);
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const i = cut.lastIndexOf(' ');
  return (i > n * 0.6 ? cut.slice(0, i) : cut).trim();
};

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

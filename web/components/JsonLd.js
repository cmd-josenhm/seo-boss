/** Injecte un bloc JSON-LD (données structurées Google). */
export default function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export const siteJsonLd = (url) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: 'BuzzAfrique',
      url,
      inLanguage: 'fr',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${url}/blog?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      name: 'BuzzAfrique',
      url,
      logo: `${url}/icon.png`,
    },
  ],
});

export const articleJsonLd = (a, url) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: a.title,
  description: a.meta_description || a.excerpt,
  inLanguage: 'fr',
  articleSection: a.category,
  keywords: (a.keywords || []).join(', '),
  wordCount: a.word_count,
  datePublished: a.published_at || a.created_at,
  dateModified: a.updated_at || a.published_at || a.created_at,
  author: { '@type': 'Organization', name: 'BuzzAfrique' },
  publisher: { '@type': 'Organization', name: 'BuzzAfrique' },
  mainEntityOfPage: `${url}/blog/${a.slug}`,
});

export const faqJsonLd = (faq) =>
  faq?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

export const breadcrumbJsonLd = (items, url) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: `${url}${it.path}`,
  })),
});

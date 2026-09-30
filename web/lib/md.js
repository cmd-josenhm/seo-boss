/**
 * Mini moteur Markdown -> HTML (titres, listes, gras, liens, tableaux simples).
 * Suffisant pour le contenu généré par l'agent, sans dépendance externe.
 * Les titres reçoivent un `id` : le sommaire (« Dans ce guide ») pointe donc
 * vers de vraies ancres.
 */

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const inline = (s) =>
  esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, href) => {
      const internal = href.startsWith('/');
      return `<a href="${href}"${internal ? '' : ' rel="noopener nofollow" target="_blank"'} >${text}</a>`;
    });

/** Identifiant d'ancre, identique à celui utilisé par le sommaire. */
export function slugifyHeading(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function mdToHtml(md) {
  const lines = String(md || '').split('\n');
  const out = [];
  let list = null; // 'ul' | 'ol'
  let para = [];
  let inTable = false;

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(' '))}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };
  const closeTable = () => {
    if (inTable) {
      out.push('</tbody></table>');
      inTable = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushPara();
      closeList();
      closeTable();
      continue;
    }

    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      flushPara();
      closeList();
      closeTable();
      const lvl = h[1].length;
      out.push(`<h${lvl} id="${slugifyHeading(h[2])}">${inline(h[2])}</h${lvl}>`);
      continue;
    }

    if (/^\|.*\|$/.test(line.trim())) {
      flushPara();
      closeList();
      if (/^\|[\s:|-]+\|$/.test(line.trim())) continue; // ligne de séparation
      const cells = line.trim().slice(1, -1).split('|').map((c) => c.trim());
      if (!inTable) {
        inTable = true;
        out.push(`<table><thead><tr>${cells.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>`);
      } else {
        out.push(`<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`);
      }
      continue;
    }
    closeTable();

    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul) {
      flushPara();
      if (list !== 'ul') {
        closeList();
        out.push('<ul>');
        list = 'ul';
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (ol) {
      flushPara();
      if (list !== 'ol') {
        closeList();
        out.push('<ol>');
        list = 'ol';
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    closeList();
    para.push(line.trim());
  }
  flushPara();
  closeList();
  closeTable();
  return out.join('\n');
}

export { esc };

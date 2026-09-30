/**
 * Mini moteur Markdown -> HTML (titres, listes, gras, liens, tableaux simples).
 * Suffisant pour le contenu généré par l'agent, sans dépendance externe.
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
      return `<a href="${href}"${internal ? '' : ' rel="noopener nofollow" target="_blank"'}>${text}</a>`;
    });

export function mdToHtml(md) {
  const lines = String(md || '').split('\n');
  const out = [];
  let list = null; // 'ul' | 'ol'
  let para = [];

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

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushPara();
      closeList();
      continue;
    }

    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      flushPara();
      closeList();
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      continue;
    }

    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ul) {
      flushPara();
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (ol) {
      flushPara();
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    if (/^\|.*\|$/.test(line.trim())) {
      flushPara();
      closeList();
      // tableau markdown simple (ignorer la ligne de séparation)
      if (/^\|[\s:|-]+\|$/.test(line.trim())) continue;
      const cells = line.trim().slice(1, -1).split('|').map((c) => c.trim());
      const tag = out._head ? 'td' : 'td';
      if (!out._inTable) {
        out.push('<table>');
        out._inTable = true;
        out._head = true;
        out.push(`<thead><tr>${cells.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>`);
        out.push('<tbody>');
        out._head = false;
      } else {
        out.push(`<tr>${cells.map((c) => `<${tag}>${inline(c)}</${tag}>`).join('')}</tr>`);
      }
      continue;
    }
    if (out._inTable) {
      out.push('</tbody></table>');
      out._inTable = false;
    }

    para.push(line.trim());
  }
  flushPara();
  closeList();
  if (out._inTable) out.push('</tbody></table>');
  return out.join('\n');
}

export { esc };

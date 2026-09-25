/**
 * African Storybook (https://www.africanstorybook.org): its book viewer
 * (newviewer/index.php?id=<id>&bt=3&dual=false) is static HTML with a cover,
 * one `<div class="page">` per page (an image and the page's text) and a back
 * cover with the credits and the licence.
 */

export const ASB_SITE = 'https://www.africanstorybook.org';

export function asbViewerUrl(id: string): string {
  return `${ASB_SITE}/newviewer/index.php?id=${encodeURIComponent(id)}&bt=3&dual=false`;
}

export function asbReaderUrl(id: string): string {
  return `${ASB_SITE}/reader.php?id=${encodeURIComponent(id)}`;
}

export interface AsbPage {
  /** Absolute URL of the page picture. */
  image: string;
  /** The page's text, one entry per line / paragraph of the book (may be empty). */
  paragraphs: string[];
}

export interface AsbBook {
  title: string;
  /** Absolute URL of the cover picture. */
  cover?: string;
  pages: AsbPage[];
  /** From the back cover: Author, Translation, Adaptation, Illustration, Language, Level … */
  credits: Record<string, string>;
  /** "© African Storybook Initiative 2014" */
  copyright: string;
  /** "Creative Commons: Attribution 4.0" */
  license: string;
}

/** The only licence we accept: CC BY 4.0 (not NC / ND, not "Attribution CC BY" without a version). */
export const ASB_CC_BY_4 = 'Creative Commons: Attribution 4.0';

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  hellip: '…',
  ndash: '–',
  mdash: '—',
};

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** HTML fragment → lines of plain text (split at <br>, tags removed, spaces collapsed). */
function lines(html: string): string[] {
  return html
    .split(/<br\s*\/?>/i)
    .map((l) => decode(l.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function divText(html: string, cls: string): string | undefined {
  const m = new RegExp(`<div[^>]*class="${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)</div>`).exec(html);
  return m?.[1];
}

export function parseAsbViewer(html: string): AsbBook {
  const title = lines(divText(html, 'cover-title') ?? '').join(' ');
  if (!title) throw new Error('不是 African Storybook 的绘本页面（没有书名）');
  const cover = /id="cover-image"[^>]*background-image:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/.exec(html)?.[1];

  const pages: AsbPage[] = [];
  const pageRe = /<div class="levelFont\d*\s+page-borders[^"]*">([\s\S]*?)<\/div>\s*<div class="page-number">/g;
  for (const m of html.matchAll(pageRe)) {
    const image = /<(?:image|img)\b[^>]*\bsrc="([^"]+)"/.exec(m[1])?.[1];
    if (!image) continue;
    const paragraphs = [...m[1].matchAll(/<p class="single-text[^"]*">([\s\S]*?)<\/p>/g)].flatMap((p) => lines(p[1]));
    pages.push({ image: decode(image), paragraphs });
  }

  const credits: Record<string, string> = {};
  for (const line of lines(divText(html, 'bookcover_author') ?? '')) {
    const m = /^([A-Za-z ]+?)\s+-\s*(.*)$/.exec(line);
    if (m && m[2]) credits[m[1]] = m[2];
  }
  const back = lines(divText(html, 'backcover_copyright') ?? '');
  const copyright = back.find((l) => l.startsWith('©')) ?? '';
  const license = back.find((l) => /creative commons|attribution|cc by/i.test(l)) ?? '';
  return { title, ...(cover ? { cover: decode(cover) } : {}), pages, credits, copyright, license };
}

/** "文：A；图：B；© C 2014（African Storybook）" for the book's cover page. */
export function asbAttribution(b: AsbBook): string {
  const c = b.credits;
  const parts = [
    c.Author && `文：${c.Author}`,
    c.Adaptation && `改编：${c.Adaptation}`,
    c.Translation && `译：${c.Translation}`,
    c.Illustration && `图：${c.Illustration}`,
    b.copyright,
  ].filter(Boolean);
  return `${parts.join('；')}（African Storybook）`;
}

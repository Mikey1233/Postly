/**
 * SVG-based carousel slide renderer using Sharp.
 *
 * Sharp is already installed — zero new dependencies.
 * Each slide is built as a complete SVG string (pattern background + text),
 * then Sharp converts it to a 1080×1080 PNG Buffer.
 *
 * Font rendering uses whatever system fonts Sharp/librsvg can find.
 * On Ubuntu (Railway/Render): Liberation Sans or DejaVu Sans.
 * On Windows (dev): Arial. On macOS: Helvetica.
 */

const sharp = require('sharp');

const SIZE  = 1080;
const PAD   = 80;
const W     = SIZE - 2 * PAD;  // 920px usable width

// ── Utilities ─────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Approximate text wrapping without a browser.
 * Rough formula: width ≈ charCount × fontSize × 0.56 (for sans-serif bold)
 *               width ≈ charCount × fontSize × 0.50 (for regular)
 */
function wrapText(text, fontSize, maxWidth, bold = false) {
  const factor     = bold ? 0.56 : 0.50;
  const maxChars   = Math.floor(maxWidth / (fontSize * factor));
  const paragraphs = String(text || '').split('\n');
  const lines      = [];

  for (const para of paragraphs) {
    if (!para.trim()) { lines.push(''); continue; }
    const words   = para.split(' ');
    let current   = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines.length ? lines : [''];
}

// Module-level render context — set by buildSlideSVG before calling per-type builders.
// Safe for synchronous rendering (no concurrent calls per process).
let _FONT_STACK = "'Poppins','Liberation Sans','DejaVu Sans',Arial,sans-serif";
let _FS = 1.0;  // font scale multiplier

/** Scale a base font size by the current render context's fontScale. */
const sz = (base) => Math.round(base * _FS);

function getFontStyle(fontFamily) {
  const family = (fontFamily || 'Poppins').replace(/ /g, '+');
  return `<style>@import url('https://fonts.googleapis.com/css2?family=${family}:wght@400;600;700;900&amp;display=swap');</style>`;
}

/** Build a <text> block with <tspan> per line. Returns SVG string. */
function textBlock({ lines, x, y, fontSize, fill, bold = false, opacity = 1, textAnchor = 'start', lineGap, letterSpacing = 0 }) {
  const gap    = lineGap ?? Math.ceil(fontSize * 1.42);
  const weight = bold ? '900' : '400';
  const ls     = letterSpacing !== 0 ? ` letter-spacing="${letterSpacing}"` : '';
  let out = `<text font-family="${_FONT_STACK}" font-size="${fontSize}" font-weight="${weight}" fill="${esc(fill)}" opacity="${opacity}" text-anchor="${textAnchor}"${ls}>`;
  lines.forEach((line, i) => {
    const dy = i === 0 ? '0' : `${gap}`;
    out += `<tspan x="${x}" dy="${dy}">${esc(line)}</tspan>`;
  });
  out += '</text>';
  return `<g transform="translate(0,${y})">${out}</g>`;
}

function centerX(singleLine, fontSize, bold = false) {
  const factor = bold ? 0.56 : 0.50;
  const estW   = singleLine.length * fontSize * factor;
  return Math.max(PAD, (SIZE - estW) / 2);
}

// ── Per-slide-type content builders ──────────────────────────────────────────

function buildCover(slide, tc, ac, brand) {
  const hSize   = sz(72);
  const hGap    = sz(88);
  const hLines  = wrapText(slide.headline || '', hSize, W, true);
  let y = PAD + 55;
  let el = textBlock({ lines: hLines, x: PAD, y, fontSize: hSize, fill: tc, bold: true, lineGap: hGap, letterSpacing: -2 });
  y += hLines.length * hGap + 28;

  if (slide.subtext) {
    const sSize  = sz(30);
    const sLines = wrapText(slide.subtext, sSize, W);
    el += textBlock({ lines: sLines, x: PAD, y, fontSize: sSize, fill: ac, lineGap: sz(44) });
  }

  const bar       = `<rect x="0" y="${SIZE - 88}" width="${SIZE}" height="88" fill="${esc(ac)}" opacity="0.92"/>`;
  const brandText = brand
    ? `<text x="${PAD}" y="${SIZE - 30}" font-family="${_FONT_STACK}" font-size="${sz(24)}" font-weight="700" fill="white">${esc(brand)}</text>`
    : '';
  const rule = `<rect x="${PAD}" y="${SIZE - 100}" width="90" height="5" fill="${esc(ac)}"/>`;

  return rule + el + bar + brandText;
}

function buildContent(slide, tc, ac, brand, idx, total) {
  const bar = `<rect x="0" y="0" width="12" height="${SIZE}" fill="${esc(ac)}"/>`;
  const x   = PAD + 24;
  const cw  = W - 24;
  let y  = PAD + 10;
  let el = bar;

  const hSize  = sz(60);
  const hGap   = sz(76);
  const hLines = wrapText(slide.headline || '', hSize, cw, true);
  el += textBlock({ lines: hLines, x, y, fontSize: hSize, fill: tc, bold: true, lineGap: hGap, letterSpacing: -1 });
  y += hLines.length * hGap + 28;

  if (slide.body) {
    const bSize  = sz(28);
    const bLines = wrapText(slide.body, bSize, cw);
    el += textBlock({ lines: bLines, x, y, fontSize: bSize, fill: tc, opacity: 0.88, lineGap: sz(42) });
    y += bLines.length * sz(42) + 20;
  }

  for (const bp of (slide.bulletPoints || [])) {
    const bSize  = sz(26);
    const bLines = wrapText(`• ${bp}`, bSize, cw);
    el += textBlock({ lines: bLines, x, y, fontSize: bSize, fill: tc, opacity: 0.82, lineGap: sz(38) });
    y += bLines.length * sz(38) + 10;
  }

  const num = `${idx}/${total}`;
  el += `<text x="${SIZE - PAD}" y="${SIZE - 28}" font-family="${_FONT_STACK}" font-size="${sz(18)}" font-weight="600" fill="${esc(tc)}" opacity="0.3" text-anchor="end">${esc(num)}</text>`;
  return el;
}

function buildStat(slide, tc, ac, idx, total) {
  const numSize = sz(140);
  const num     = slide.statNumber || '';
  const nx      = centerX(num, numSize, true);
  let el = `<text x="${nx}" y="570" font-family="${_FONT_STACK}" font-size="${numSize}" font-weight="900" letter-spacing="-3" fill="${esc(ac)}">${esc(num)}</text>`;
  let y = 600;

  if (slide.statLabel) {
    const lSize  = sz(36);
    const lLines = wrapText(slide.statLabel, lSize, W, true);
    lLines.forEach((line, i) => {
      const lx = centerX(line, lSize, true);
      el += `<text x="${lx}" y="${y + i * sz(50)}" font-family="${_FONT_STACK}" font-size="${lSize}" font-weight="700" letter-spacing="-0.5" fill="${esc(tc)}">${esc(line)}</text>`;
    });
    y += lLines.length * sz(50) + 18;
  }

  if (slide.body) {
    const bSize  = sz(24);
    const bLines = wrapText(slide.body, bSize, W);
    bLines.forEach((line, i) => {
      const bx = centerX(line, bSize, false);
      el += `<text x="${bx}" y="${y + i * sz(36)}" font-family="${_FONT_STACK}" font-size="${bSize}" fill="${esc(tc)}" opacity="0.65">${esc(line)}</text>`;
    });
  }

  el += `<text x="${SIZE - PAD}" y="${SIZE - 28}" font-family="${_FONT_STACK}" font-size="${sz(18)}" font-weight="600" fill="${esc(tc)}" opacity="0.3" text-anchor="end">${esc(idx)}/${esc(total)}</text>`;
  return el;
}

function buildQuote(slide, tc, ac, idx, total) {
  const qSize  = sz(44);
  const lineH  = sz(62);
  const qLines = wrapText(slide.quote || '', qSize, W - 40, true);
  const totalH = qLines.length * lineH;
  const startY = Math.max(220, (SIZE - totalH) / 2 - 50);

  let el = `<text x="10" y="230" font-family="${_FONT_STACK}" font-size="${sz(240)}" font-weight="900" fill="${esc(ac)}" opacity="0.08">"</text>`;

  qLines.forEach((line, i) => {
    const lx = centerX(line, qSize, true);
    el += `<text x="${lx}" y="${startY + i * lineH}" font-family="${_FONT_STACK}" font-size="${qSize}" font-weight="700" letter-spacing="-0.5" fill="${esc(tc)}">${esc(line)}</text>`;
  });

  const attrY = startY + qLines.length * lineH + 36;
  if (slide.attribution) {
    const attrText = `— ${slide.attribution}`;
    const aSize    = sz(24);
    const ax       = centerX(attrText, aSize, false);
    el += `<text x="${ax}" y="${attrY}" font-family="${_FONT_STACK}" font-size="${aSize}" font-weight="600" fill="${esc(ac)}">${esc(attrText)}</text>`;
  }

  el += `<rect x="${PAD}" y="${SIZE - 72}" width="${W}" height="4" fill="${esc(ac)}" opacity="0.6"/>`;
  el += `<text x="${SIZE - PAD}" y="${SIZE - 28}" font-family="${_FONT_STACK}" font-size="${sz(18)}" font-weight="600" fill="${esc(tc)}" opacity="0.3" text-anchor="end">${esc(idx)}/${esc(total)}</text>`;
  return el;
}

function buildCTA(slide, brand) {
  const hSize  = sz(66);
  const lineH  = sz(82);
  const headline = slide.headline || 'Follow for more';
  const hLines   = wrapText(headline, hSize, W, true);
  const totalH   = hLines.length * lineH;
  const startY   = (SIZE / 2) - (totalH / 2) - 40;

  let el = '';
  hLines.forEach((line, i) => {
    const lx = centerX(line, hSize, true);
    el += `<text x="${lx}" y="${startY + i * lineH}" font-family="${_FONT_STACK}" font-size="${hSize}" font-weight="900" letter-spacing="-1" fill="white">${esc(line)}</text>`;
  });

  let y = startY + hLines.length * lineH + 28;
  if (slide.body) {
    const bSize  = sz(28);
    const bLines = wrapText(slide.body, bSize, W);
    bLines.forEach((line, i) => {
      const bx = centerX(line, bSize, false);
      el += `<text x="${bx}" y="${y + i * sz(44)}" font-family="${_FONT_STACK}" font-size="${bSize}" fill="rgba(255,255,255,0.82)">${esc(line)}</text>`;
    });
  }

  if (brand) {
    const brSize = sz(22);
    const bx     = centerX(brand, brSize, true);
    el += `<text x="${bx}" y="${SIZE - 48}" font-family="${_FONT_STACK}" font-size="${brSize}" font-weight="700" fill="rgba(255,255,255,0.72)">${esc(brand)}</text>`;
  }

  return el;
}

// ── Full slide SVG assembler ──────────────────────────────────────────────────

function buildSlideSVG(slide, pattern, slideNumber, totalSlides, brandName, fontFamily, fontScale) {
  // Set module-level render context before calling builders
  _FS         = fontScale  || 1.0;
  _FONT_STACK = `'${fontFamily || 'Poppins'}','Poppins','Liberation Sans','DejaVu Sans',Arial,sans-serif`;

  const tc    = pattern.textColor;
  const ac    = pattern.accentColor;
  const brand = brandName || '';
  const idx   = slideNumber;
  const total = totalSlides;

  let content;
  switch (slide.type) {
    case 'cover':   content = buildCover(slide, tc, ac, brand);               break;
    case 'stat':    content = buildStat(slide, tc, ac, idx, total);           break;
    case 'quote':   content = buildQuote(slide, tc, ac, idx, total);          break;
    case 'cta':     content = buildCTA(slide, brand);                         break;
    default:        content = buildContent(slide, tc, ac, brand, idx, total); break;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  ${getFontStyle(fontFamily)}
  ${pattern.background()}
  ${content}
</svg>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Render one slide to a PNG Buffer. */
/** Render one slide to a PNG Buffer. fontFamily/fontScale override theme defaults. */
async function renderSlide(slide, pattern, slideNumber, totalSlides, brandName, fontFamily, fontScale) {
  const svg = buildSlideSVG(slide, pattern, slideNumber, totalSlides, brandName, fontFamily, fontScale);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Render all slides of a carousel, return array of Buffers in slide order.
 *  config: { fontFamily?, fontScale? } — merged with carousel.theme values. */
async function renderCarousel(carousel, pattern, config = {}) {
  const slides     = [...(carousel.slides || [])].sort((a, b) => a.order - b.order);
  const total      = slides.length;
  const brandName  = carousel.theme?.brandName || '';
  const fontFamily = config.fontFamily ?? carousel.theme?.font       ?? 'Poppins';
  const fontScale  = config.fontScale  ?? carousel.theme?.fontScale  ?? 1.0;
  const buffers    = [];

  for (let i = 0; i < slides.length; i++) {
    const buf = await renderSlide(slides[i], pattern, i + 1, total, brandName, fontFamily, fontScale);
    buffers.push(buf);
  }
  return buffers;
}

module.exports = { renderSlide, renderCarousel, buildSlideSVG };

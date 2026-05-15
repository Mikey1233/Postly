/**
 * Converts a slide data object + carousel theme into a detailed image-generation
 * prompt for Nano Banana (GPT Image 2 / nb2 model).
 *
 * Design philosophy:
 *  - Each prompt is self-contained: colours, layout, exact text content.
 *  - Text is wrapped in quotes so the model knows to render it verbatim.
 *  - We avoid vague style words; every instruction is spatial and concrete.
 *  - gpt2 model handles embedded text well — keep headlines short (≤10 words).
 */

function buildSlidePrompt(slide, theme, index, total) {
  const primary = (theme.primaryColor   || '#0A66C2').toUpperCase();
  const bg      = (theme.backgroundColor || '#FFFFFF').toUpperCase();
  const brand   = (theme.brandName || '').trim();

  const base = [
    'Professional LinkedIn carousel slide.',
    'Square 1:1 format, 1080×1080 pixels.',
    'Clean, modern, minimal design.',
    'No people, no photographs, no stock imagery, no clip-art, no icons.',
    'High-quality typography only.',
  ].join(' ');

  const pageTag  = `Small light-gray text "${index + 1}/${total}" in the bottom-right corner.`;
  const brandTag = brand ? `Very small text "${brand}" centred at the very bottom.` : '';

  switch (slide.type) {

    case 'cover': {
      const headline = (slide.headline || '').toUpperCase();
      const subtext  = slide.subtext || '';
      return `${base}

LAYOUT — Cover slide, bold and scroll-stopping.
Background colour: ${bg}.
Full-width thick horizontal colour bar at the very bottom, colour ${primary}, height ~12% of canvas.
${brand ? `White bold text inside the bar: "${brand}"` : ''}

LARGE BOLD WHITE OR DARK HEADLINE centred in the upper two-thirds:
"${headline}"
${subtext ? `MEDIUM SUBTEXT directly below the headline, colour ${primary}: "${subtext}"` : ''}

A subtle geometric accent (thin diagonal stripe or corner triangle) in ${primary} on the background.
Font: Bold sans-serif. No decorative or script fonts.
The slide must feel like a magazine cover — powerful, minimal, on-brand.`;
    }

    case 'content': {
      const headline     = slide.headline || '';
      const body         = slide.body || '';
      const bullets      = (slide.bulletPoints || []).filter(Boolean);
      return `${base}

LAYOUT — Content slide, left-accented.
Background: white (#FFFFFF).
A solid vertical bar, width 10px, full canvas height, colour ${primary}, flush against the left edge.
All text starts 40px from the left edge (past the bar), with 60px right margin.

LARGE BOLD HEADLINE near the top:
"${headline}"

${body ? `REGULAR-WEIGHT BODY TEXT below (2 lines max):\n"${body}"` : ''}
${bullets.length ? `BULLET POINTS below the body, each on its own line:\n${bullets.map((b) => `• "${b}"`).join('\n')}` : ''}

${pageTag}
${brandTag}
Font: clean sans-serif. Text colour: near-black (#1A1A1A). Generous line-spacing.`;
    }

    case 'stat': {
      const num   = slide.statNumber || '';
      const label = slide.statLabel  || '';
      const body  = slide.body       || '';
      return `${base}

LAYOUT — Stat slide, centred impact number.
Background: very light (#F5F7FF).
Full-width 10px colour bar at the very top, colour ${primary}.

GIANT CENTRED NUMBER, bold, colour ${primary}, roughly 35% of canvas height:
"${num}"

BOLD LABEL directly below the number, dark text:
"${label}"

${body ? `SMALL GRAY CONTEXT TEXT below the label:\n"${body}"` : ''}

${pageTag}
${brandTag}
Everything centred. Lots of breathing room. The number is the hero.`;
    }

    case 'quote': {
      const quote       = slide.quote       || '';
      const attribution = slide.attribution || '';
      return `${base}

LAYOUT — Quote slide, editorial.
Background: white (#FFFFFF).
A very large, faint open-quote character ( " ) in colour ${primary} at 8% opacity, positioned top-left, decorative.
A thin full-width 3px horizontal rule at the very bottom, colour ${primary}.

BOLD CENTRED QUOTE TEXT in the middle zone:
"${quote}"

${attribution ? `SMALL CENTRED ATTRIBUTION TEXT in ${primary}, below the quote:\n"— ${attribution}"` : ''}

${pageTag}
${brandTag}
Elegant. Generous white space. Quote text is the focal point.`;
    }

    case 'cta': {
      const headline = slide.headline || 'Follow for more';
      const body     = slide.body     || '';
      return `${base}

LAYOUT — CTA slide, full-bleed colour, all white text.
Entire background: solid ${primary}.
All text: white (#FFFFFF).

VERY LARGE BOLD CENTRED HEADLINE:
"${headline}"

${body ? `MEDIUM CENTRED BODY TEXT below:\n"${body}"` : ''}

${brand ? `SMALL BOLD TEXT at the very bottom, white: "${brand}"` : ''}
Bold. Energetic. No page number on CTA slide.
The slide should feel like a call to action — direct and confident.`;
    }

    default:
      return `${base}
Background: ${bg}. Primary accent: ${primary}.
Centred bold headline text: "${slide.headline || ''}"
${brand ? `Small footer: "${brand}"` : ''}
${pageTag}`;
  }
}

module.exports = { buildSlidePrompt };

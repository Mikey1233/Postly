const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { upload, download, MEDIA_BUCKET, CAROUSEL_BUCKET } = require('../media/storage');
const db = require('../../db');

const PAGE = 1080;
const PAD  = 80;
const W    = PAGE - 2 * PAD; // 920 — usable content width

/**
 * Replace every character outside WinAnsi (Latin-1) with a safe ASCII equivalent.
 * pdf-lib uses Helvetica / WinAnsi encoding which covers only U+0000–U+00FF.
 * The AI frequently produces arrows, em-dashes, smart quotes, bullets, etc.
 */
function sanitize(text) {
  if (!text) return '';
  return String(text)
    // Common symbols the AI loves to output
    .replace(/→|➔|➜|➡/g, '->')
    .replace(/←|⬅/g, '<-')
    .replace(/↑/g, '^')
    .replace(/↓/g, 'v')
    .replace(/•|·|▪|▸|▶/g, '*')
    .replace(/—|—/g, '-')       // em-dash
    .replace(/–|–/g, '-')       // en-dash
    .replace(/[""]/g, '"')           // smart double quotes
    .replace(/['']/g, "'")           // smart single quotes / apostrophe
    .replace(/…|…/g, '...')     // ellipsis
    .replace(/ /g, ' ')         // non-breaking space
    .replace(/[^\x00-\xFF]/g, '');   // drop anything else outside Latin-1
}

function hexToRgb(hex) {
  const h = (hex || '#000000').replace('#', '');
  return rgb(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  );
}

// Wrap text into lines that fit within maxWidth at the given fontSize
function wrapLines(text, font, size, maxWidth) {
  const lines = [];
  for (const para of sanitize(text || '').split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [''];
}

// Return x position that centres text horizontally on the page
function centerX(text, font, size) {
  return Math.max(0, (PAGE - font.widthOfTextAtSize(text, size)) / 2);
}

// Draw wrapped lines; returns the y after the last line
function drawWrapped(page, text, { x, y, font, size, color, maxWidth, lineGap }) {
  const lines = wrapLines(text, font, size, maxWidth);
  const gap   = lineGap ?? Math.ceil(size * 1.5);
  for (const line of lines) {
    page.drawText(line, { x, y, size, font, color });
    y -= gap;
  }
  return y;
}

// ── Slide Renderers ──────────────────────────────────────────────────────────

function renderCover(page, slide, theme, boldFont, regFont, primary) {
  const text  = hexToRgb(theme.textColor || '#1A1A1A');
  const white = rgb(1, 1, 1);

  // Bottom brand bar
  page.drawRectangle({ x: 0, y: 0, width: PAGE, height: 72, color: primary });
  if (theme.brandName) {
    page.drawText(sanitize(theme.brandName), { x: PAD, y: 24, size: 22, font: boldFont, color: white });
  }

  // Headline — large, starting near the top
  let y = PAGE - PAD - 10;
  y = drawWrapped(page, slide.headline || '', { x: PAD, y, font: boldFont, size: 58, color: text, maxWidth: W, lineGap: 76 });

  // Accent rule under headline
  const ruleY = y + 20;
  page.drawRectangle({ x: PAD, y: ruleY, width: 80, height: 5, color: primary });

  // Subtext
  if (slide.subtext) {
    drawWrapped(page, slide.subtext, { x: PAD, y: ruleY - 50, font: regFont, size: 28, color: primary, maxWidth: W, lineGap: 42 });
  }
}

function renderContent(page, slide, theme, boldFont, regFont, primary) {
  const text     = hexToRgb(theme.textColor || '#1A1A1A');
  const lightGray = rgb(0.6, 0.6, 0.6);

  // Left accent bar
  page.drawRectangle({ x: 0, y: 0, width: 10, height: PAGE, color: primary });

  const x     = PAD + 20;
  const width = W - 20;
  let y = PAGE - PAD - 10;

  // Headline
  y = drawWrapped(page, slide.headline || '', { x, y, font: boldFont, size: 44, color: text, maxWidth: width, lineGap: 62 });
  y -= 24;

  // Body
  if (slide.body) {
    y = drawWrapped(page, slide.body, { x, y, font: regFont, size: 26, color: text, maxWidth: width, lineGap: 40 });
    y -= 20;
  }

  // Bullet points
  if (slide.bulletPoints?.length) {
    for (const bp of slide.bulletPoints) {
      y = drawWrapped(page, `• ${bp}`, { x, y, font: regFont, size: 24, color: text, maxWidth: width, lineGap: 36 });
      y -= 8;
    }
  }

  // Slide order indicator
  if (slide.order) {
    page.drawText(String(slide.order), { x: PAGE - 48, y: 28, size: 18, font: regFont, color: lightGray });
  }
}

function renderStat(page, slide, theme, boldFont, regFont, primary) {
  const text = hexToRgb(theme.textColor || '#1A1A1A');

  // Subtle background tint
  page.drawRectangle({ x: 0, y: 0, width: PAGE, height: PAGE, color: rgb(0.97, 0.97, 0.99) });
  page.drawRectangle({ x: 0, y: 0, width: PAGE, height: 8, color: primary });

  // Stat number — giant and centered
  const numStr  = slide.statNumber || '';
  const numSize = 120;
  page.drawText(numStr, { x: centerX(numStr, boldFont, numSize), y: 560, size: numSize, font: boldFont, color: primary });

  // Stat label
  let y = 520;
  if (slide.statLabel) {
    const labelLines = wrapLines(slide.statLabel, boldFont, 30, W);
    for (const line of labelLines) {
      page.drawText(line, { x: centerX(line, boldFont, 30), y, size: 30, font: boldFont, color: text });
      y -= 44;
    }
  }

  // Body
  if (slide.body) {
    y -= 16;
    const bodyLines = wrapLines(slide.body, regFont, 24, W);
    for (const line of bodyLines) {
      page.drawText(line, { x: centerX(line, regFont, 24), y, size: 24, font: regFont, color: rgb(0.4, 0.4, 0.4) });
      y -= 36;
    }
  }
}

function renderQuote(page, slide, theme, boldFont, regFont, primary) {
  const text = hexToRgb(theme.textColor || '#1A1A1A');

  // Decorative open-quote (faint)
  page.drawText('“', { x: 30, y: PAGE - 50, size: 220, font: boldFont, color: rgb(0.9, 0.92, 0.97) });

  // Quote text — centered
  const qLines = wrapLines(slide.quote || '', boldFont, 38, W - 40);
  let y = 680;
  for (const line of qLines) {
    page.drawText(line, { x: centerX(line, boldFont, 38), y, size: 38, font: boldFont, color: text });
    y -= 56;
  }

  // Attribution
  if (slide.attribution) {
    y -= 20;
    const attText = `— ${slide.attribution}`;
    page.drawText(attText, { x: centerX(attText, regFont, 22), y, size: 22, font: regFont, color: primary });
  }

  // Bottom rule
  page.drawRectangle({ x: PAD, y: 60, width: W, height: 3, color: primary });
}

function renderCTA(page, slide, theme, boldFont, regFont, primary) {
  // Primary-colour background
  page.drawRectangle({ x: 0, y: 0, width: PAGE, height: PAGE, color: primary });
  const white   = rgb(1, 1, 1);
  const offWhite = rgb(0.88, 0.9, 1);

  // Headline
  const hLines = wrapLines(slide.headline || 'Follow for more', boldFont, 54, W);
  let y = PAGE - PAD - 20;
  for (const line of hLines) {
    page.drawText(line, { x: centerX(line, boldFont, 54), y, size: 54, font: boldFont, color: white });
    y -= 74;
  }

  // Body
  if (slide.body) {
    y -= 20;
    const bLines = wrapLines(slide.body, regFont, 28, W);
    for (const line of bLines) {
      page.drawText(line, { x: centerX(line, regFont, 28), y, size: 28, font: regFont, color: offWhite });
      y -= 42;
    }
  }

  // Brand name at bottom
  if (theme.brandName) {
    page.drawText(theme.brandName, { x: centerX(theme.brandName, boldFont, 22), y: 80, size: 22, font: boldFont, color: white });
  }
}

// ── Main export ──────────────────────────────────────────────────────────────

async function generateCarouselPDF(carousel) {
  const pdfDoc  = await PDFDocument.create();
  const regFont  = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const theme   = carousel.theme || {};
  const primary = hexToRgb(theme.primaryColor   || '#0A66C2');
  const bgColor = hexToRgb(theme.backgroundColor || '#FFFFFF');

  const sortedSlides = [...carousel.slides].sort((a, b) => a.order - b.order);

  for (const slide of sortedSlides) {
    const page = pdfDoc.addPage([PAGE, PAGE]);
    page.drawRectangle({ x: 0, y: 0, width: PAGE, height: PAGE, color: bgColor });

    switch (slide.type) {
      case 'cover':   renderCover(page, slide, theme, boldFont, regFont, primary);   break;
      case 'content': renderContent(page, slide, theme, boldFont, regFont, primary); break;
      case 'stat':    renderStat(page, slide, theme, boldFont, regFont, primary);    break;
      case 'quote':   renderQuote(page, slide, theme, boldFont, regFont, primary);   break;
      case 'cta':     renderCTA(page, slide, theme, boldFont, regFont, primary);     break;
    }

    // Brand logo — bottom-right corner of every slide
    if (theme.logoStoragePath) {
      try {
        const logoBytes = await download(MEDIA_BUCKET, theme.logoStoragePath);
        const ext = theme.logoStoragePath.split('.').pop().toLowerCase();
        const logoImg = (ext === 'png') ? await pdfDoc.embedPng(logoBytes) : await pdfDoc.embedJpg(logoBytes);
        const { width: lw, height: lh } = logoImg.scaleToFit(60, 60);
        page.drawImage(logoImg, { x: PAGE - lw - 20, y: 20, width: lw, height: lh });
      } catch {
        // Logo unavailable — continue without it
      }
    }
  }

  const pdfBuffer = Buffer.from(await pdfDoc.save());

  // Upload and update DB (upsert so regeneration on retry doesn't collide)
  const storagePath = `pdfs/${carousel.id}/carousel.pdf`;
  await upload(CAROUSEL_BUCKET, storagePath, pdfBuffer, 'application/pdf', { upsert: true });
  await db.carousels.update(carousel.id, { pdf_storage_path: storagePath });

  return pdfBuffer;
}

// ── Image-based PDF (for AI-designed carousels) ───────────────────────────────

async function generateDesignedCarouselPDF(carouselId, imageStoragePaths) {
  const pdfDoc = await PDFDocument.create();

  for (const imagePath of imageStoragePaths) {
    const imageBytes = await download(CAROUSEL_BUCKET, imagePath);
    const page = pdfDoc.addPage([PAGE, PAGE]);
    let img;
    try {
      img = await pdfDoc.embedJpg(imageBytes);
    } catch {
      img = await pdfDoc.embedPng(imageBytes);
    }
    page.drawImage(img, { x: 0, y: 0, width: PAGE, height: PAGE });
  }

  const pdfBuffer = Buffer.from(await pdfDoc.save());
  const storagePath = `pdfs/${carouselId}/carousel.pdf`;
  await upload(CAROUSEL_BUCKET, storagePath, pdfBuffer, 'application/pdf', { upsert: true });
  await db.carousels.update(carouselId, { pdf_storage_path: storagePath });

  return pdfBuffer;
}

module.exports = { generateCarouselPDF, generateDesignedCarouselPDF };

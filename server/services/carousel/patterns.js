/**
 * 8 handcrafted SVG background patterns for carousel slides.
 * Each pattern returns the inner SVG elements (no outer <svg> tag).
 * The renderer embeds these into a 1080×1080 SVG document.
 */

const PATTERNS = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    id:          'deep-ocean',
    name:        'Deep Ocean',
    description: 'Dark teal depths with glowing arcs',
    textColor:   '#FFFFFF',
    accentColor: '#78CFF7',
    // CSS gradient used by the client-side pattern picker thumbnail
    previewCss:  'linear-gradient(135deg, #001524 0%, #0E4A54 60%, #15616D 100%)',

    background: () => `
<defs>
  <linearGradient id="ocean_bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#001524"/>
    <stop offset="60%"  stop-color="#0E4A54"/>
    <stop offset="100%" stop-color="#15616D"/>
  </linearGradient>
  <radialGradient id="ocean_glow" cx="80%" cy="15%" r="55%">
    <stop offset="0%"   stop-color="#78CFF7" stop-opacity="0.18"/>
    <stop offset="100%" stop-color="#78CFF7" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="ocean_glow2" cx="5%" cy="90%" r="45%">
    <stop offset="0%"   stop-color="#0096B7" stop-opacity="0.14"/>
    <stop offset="100%" stop-color="#0096B7" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1080" height="1080" fill="url(#ocean_bg)"/>
<rect width="1080" height="1080" fill="url(#ocean_glow)"/>
<rect width="1080" height="1080" fill="url(#ocean_glow2)"/>
<circle cx="940" cy="-60" r="320" fill="none" stroke="#78CFF7" stroke-width="55" opacity="0.06"/>
<circle cx="1020" cy="80" r="200" fill="none" stroke="#78CFF7" stroke-width="35" opacity="0.05"/>
<circle cx="-80" cy="1060" r="380" fill="none" stroke="#0096B7" stroke-width="60" opacity="0.07"/>
<path d="M-100,720 Q200,660 540,700 T1200,680" fill="none" stroke="#78CFF7" stroke-width="1.5" opacity="0.15"/>
<path d="M-100,780 Q200,730 540,760 T1200,750" fill="none" stroke="#78CFF7" stroke-width="1" opacity="0.1"/>
<path d="M-100,840 Q200,800 540,820 T1200,810" fill="none" stroke="#78CFF7" stroke-width="1" opacity="0.07"/>
<circle cx="960" cy="960" r="4" fill="#78CFF7" opacity="0.35"/>
<circle cx="985" cy="940" r="3" fill="#78CFF7" opacity="0.25"/>
<circle cx="1005" cy="962" r="2" fill="#78CFF7" opacity="0.2"/>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id:          'cosmic',
    name:        'Cosmic',
    description: 'Deep space with stardust and geometry',
    textColor:   '#FFFFFF',
    accentColor: '#B57BFF',
    previewCss:  'linear-gradient(135deg, #050010 0%, #0E0025 50%, #1A003A 100%)',

    background: () => `
<defs>
  <linearGradient id="cos_bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#050010"/>
    <stop offset="55%"  stop-color="#0E0025"/>
    <stop offset="100%" stop-color="#1A003A"/>
  </linearGradient>
  <radialGradient id="cos_orb1" cx="75%" cy="20%" r="40%">
    <stop offset="0%"   stop-color="#7B2FBE" stop-opacity="0.25"/>
    <stop offset="100%" stop-color="#7B2FBE" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="cos_orb2" cx="15%" cy="80%" r="35%">
    <stop offset="0%"   stop-color="#2D46B9" stop-opacity="0.2"/>
    <stop offset="100%" stop-color="#2D46B9" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1080" height="1080" fill="url(#cos_bg)"/>
<rect width="1080" height="1080" fill="url(#cos_orb1)"/>
<rect width="1080" height="1080" fill="url(#cos_orb2)"/>
<circle cx="120" cy="95"  r="2" fill="white" opacity="0.5"/>
<circle cx="245" cy="180" r="1.5" fill="white" opacity="0.4"/>
<circle cx="380" cy="60"  r="1" fill="white" opacity="0.6"/>
<circle cx="520" cy="140" r="2.5" fill="white" opacity="0.3"/>
<circle cx="660" cy="80"  r="1.5" fill="white" opacity="0.5"/>
<circle cx="800" cy="50"  r="1" fill="white" opacity="0.4"/>
<circle cx="920" cy="160" r="2" fill="white" opacity="0.5"/>
<circle cx="70"  cy="300" r="1" fill="white" opacity="0.3"/>
<circle cx="190" cy="400" r="1.5" fill="white" opacity="0.4"/>
<circle cx="450" cy="320" r="1" fill="white" opacity="0.5"/>
<circle cx="730" cy="280" r="2" fill="white" opacity="0.3"/>
<circle cx="980" cy="340" r="1" fill="white" opacity="0.4"/>
<circle cx="1020" cy="200" r="3" fill="#B57BFF" opacity="0.6"/>
<circle cx="55"  cy="500" r="2.5" fill="#B57BFF" opacity="0.4"/>
<polygon points="880,850 920,800 960,850 920,900" fill="none" stroke="#B57BFF" stroke-width="1.5" opacity="0.25"/>
<polygon points="820,910 840,880 860,910 840,940" fill="none" stroke="#B57BFF" stroke-width="1" opacity="0.2"/>
<line x1="870" y1="820" x2="940" y2="920" stroke="#B57BFF" stroke-width="0.5" opacity="0.15"/>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id:          'ember',
    name:        'Ember',
    description: 'Fiery sunset with diagonal light rays',
    textColor:   '#FFFFFF',
    accentColor: '#FFD166',
    previewCss:  'linear-gradient(135deg, #1A0200 0%, #8B1A00 45%, #D62B00 75%, #FF6B35 100%)',

    background: () => `
<defs>
  <linearGradient id="emb_bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#1A0200"/>
    <stop offset="45%"  stop-color="#8B1A00"/>
    <stop offset="75%"  stop-color="#D62B00"/>
    <stop offset="100%" stop-color="#FF6B35"/>
  </linearGradient>
  <radialGradient id="emb_glow" cx="85%" cy="15%" r="50%">
    <stop offset="0%"   stop-color="#FF6B35" stop-opacity="0.4"/>
    <stop offset="100%" stop-color="#FF6B35" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1080" height="1080" fill="url(#emb_bg)"/>
<rect width="1080" height="1080" fill="url(#emb_glow)"/>
<line x1="1080" y1="0"   x2="400" y2="1080" stroke="rgba(255,200,100,0.07)" stroke-width="80"/>
<line x1="1080" y1="0"   x2="550" y2="1080" stroke="rgba(255,200,100,0.05)" stroke-width="50"/>
<line x1="1080" y1="0"   x2="700" y2="1080" stroke="rgba(255,200,100,0.04)" stroke-width="30"/>
<circle cx="1000" cy="80" r="220" fill="rgba(255,200,80,0.08)"/>
<circle cx="1000" cy="80" r="140" fill="rgba(255,200,80,0.06)"/>
<path d="M0,950 Q270,900 540,940 T1080,930 V1080 H0" fill="rgba(255,100,0,0.12)"/>
<path d="M0,990 Q270,950 540,980 T1080,970 V1080 H0" fill="rgba(255,100,0,0.08)"/>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id:          'forest-night',
    name:        'Forest Night',
    description: 'Rich emerald darkness with hex texture',
    textColor:   '#FFFFFF',
    accentColor: '#52B788',
    previewCss:  'linear-gradient(135deg, #081410 0%, #102B22 50%, #1B4332 100%)',

    background: () => `
<defs>
  <linearGradient id="fst_bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#081410"/>
    <stop offset="50%"  stop-color="#102B22"/>
    <stop offset="100%" stop-color="#1B4332"/>
  </linearGradient>
  <radialGradient id="fst_glow" cx="70%" cy="30%" r="50%">
    <stop offset="0%"   stop-color="#52B788" stop-opacity="0.12"/>
    <stop offset="100%" stop-color="#52B788" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1080" height="1080" fill="url(#fst_bg)"/>
<rect width="1080" height="1080" fill="url(#fst_glow)"/>
<path d="M200,0 L280,135 L120,135 Z" fill="none" stroke="#52B788" stroke-width="0.8" opacity="0.1"/>
<path d="M440,0 L520,135 L360,135 Z" fill="none" stroke="#52B788" stroke-width="0.8" opacity="0.1"/>
<path d="M680,0 L760,135 L600,135 Z" fill="none" stroke="#52B788" stroke-width="0.8" opacity="0.1"/>
<path d="M920,0 L1000,135 L840,135 Z" fill="none" stroke="#52B788" stroke-width="0.8" opacity="0.1"/>
<path d="M80,135 L160,270 L0,270 Z" fill="none" stroke="#52B788" stroke-width="0.8" opacity="0.08"/>
<path d="M320,135 L400,270 L240,270 Z" fill="none" stroke="#52B788" stroke-width="0.8" opacity="0.08"/>
<path d="M-100,600 Q150,520 400,580 Q650,640 900,560 Q1050,510 1200,570" fill="none" stroke="#52B788" stroke-width="1.5" opacity="0.12"/>
<path d="M-100,700 Q200,640 500,680 Q750,720 1100,660" fill="none" stroke="#52B788" stroke-width="1" opacity="0.09"/>
<circle cx="-50" cy="1080" r="300" fill="none" stroke="#52B788" stroke-width="50" opacity="0.06"/>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id:          'circuit',
    name:        'Circuit',
    description: 'Dark tech grid with neon pulse',
    textColor:   '#FFFFFF',
    accentColor: '#00F0FF',
    previewCss:  'linear-gradient(135deg, #010B18 0%, #020D20 100%)',

    background: () => `
<defs>
  <linearGradient id="cir_bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#010B18"/>
    <stop offset="100%" stop-color="#020D20"/>
  </linearGradient>
  <radialGradient id="cir_glow" cx="50%" cy="50%" r="60%">
    <stop offset="0%"   stop-color="#00F0FF" stop-opacity="0.06"/>
    <stop offset="100%" stop-color="#00F0FF" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1080" height="1080" fill="url(#cir_bg)"/>
<rect width="1080" height="1080" fill="url(#cir_glow)"/>
<line x1="0" y1="120"  x2="1080" y2="120"  stroke="#00F0FF" stroke-width="0.5" opacity="0.08"/>
<line x1="0" y1="240"  x2="1080" y2="240"  stroke="#00F0FF" stroke-width="0.5" opacity="0.08"/>
<line x1="0" y1="360"  x2="1080" y2="360"  stroke="#00F0FF" stroke-width="0.5" opacity="0.08"/>
<line x1="0" y1="480"  x2="1080" y2="480"  stroke="#00F0FF" stroke-width="0.5" opacity="0.08"/>
<line x1="0" y1="600"  x2="1080" y2="600"  stroke="#00F0FF" stroke-width="0.5" opacity="0.06"/>
<line x1="0" y1="720"  x2="1080" y2="720"  stroke="#00F0FF" stroke-width="0.5" opacity="0.06"/>
<line x1="0" y1="840"  x2="1080" y2="840"  stroke="#00F0FF" stroke-width="0.5" opacity="0.06"/>
<line x1="0" y1="960"  x2="1080" y2="960"  stroke="#00F0FF" stroke-width="0.5" opacity="0.06"/>
<line x1="120"  y1="0" x2="120"  y2="1080" stroke="#00F0FF" stroke-width="0.5" opacity="0.08"/>
<line x1="240"  y1="0" x2="240"  y2="1080" stroke="#00F0FF" stroke-width="0.5" opacity="0.08"/>
<line x1="360"  y1="0" x2="360"  y2="1080" stroke="#00F0FF" stroke-width="0.5" opacity="0.08"/>
<line x1="480"  y1="0" x2="480"  y2="1080" stroke="#00F0FF" stroke-width="0.5" opacity="0.08"/>
<line x1="600"  y1="0" x2="600"  y2="1080" stroke="#00F0FF" stroke-width="0.5" opacity="0.06"/>
<line x1="720"  y1="0" x2="720"  y2="1080" stroke="#00F0FF" stroke-width="0.5" opacity="0.06"/>
<line x1="840"  y1="0" x2="840"  y2="1080" stroke="#00F0FF" stroke-width="0.5" opacity="0.06"/>
<line x1="960"  y1="0" x2="960"  y2="1080" stroke="#00F0FF" stroke-width="0.5" opacity="0.06"/>
<circle cx="120" cy="120" r="3" fill="#00F0FF" opacity="0.25"/>
<circle cx="360" cy="240" r="3" fill="#00F0FF" opacity="0.2"/>
<circle cx="720" cy="120" r="4" fill="#00F0FF" opacity="0.3"/>
<circle cx="960" cy="360" r="3" fill="#00F0FF" opacity="0.2"/>
<circle cx="240" cy="720" r="3" fill="#00F0FF" opacity="0.2"/>
<circle cx="600" cy="840" r="4" fill="#00F0FF" opacity="0.25"/>
<path d="M720,120 L720,240 L840,240" fill="none" stroke="#00F0FF" stroke-width="1" opacity="0.18"/>
<path d="M240,720 L360,720 L360,840" fill="none" stroke="#00F0FF" stroke-width="1" opacity="0.15"/>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id:          'aurora',
    name:        'Aurora',
    description: 'Northern lights sweeping across dark sky',
    textColor:   '#FFFFFF',
    accentColor: '#C77DFF',
    previewCss:  'linear-gradient(135deg, #0A0020 0%, #15003A 40%, #0A0030 70%, #001A40 100%)',

    background: () => `
<defs>
  <linearGradient id="aur_bg" x1="0" y1="0" x2="0.3" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#0A0020"/>
    <stop offset="40%"  stop-color="#15003A"/>
    <stop offset="70%"  stop-color="#0A0030"/>
    <stop offset="100%" stop-color="#001A40"/>
  </linearGradient>
  <linearGradient id="aur_band1" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stop-color="#7B2FBE" stop-opacity="0"/>
    <stop offset="25%"  stop-color="#7B2FBE" stop-opacity="0.3"/>
    <stop offset="60%"  stop-color="#00B4D8" stop-opacity="0.25"/>
    <stop offset="100%" stop-color="#00B4D8" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="aur_band2" x1="0.1" y1="0" x2="0.9" y2="0">
    <stop offset="0%"   stop-color="#F72585" stop-opacity="0"/>
    <stop offset="30%"  stop-color="#B5179E" stop-opacity="0.2"/>
    <stop offset="70%"  stop-color="#7209B7" stop-opacity="0.2"/>
    <stop offset="100%" stop-color="#7209B7" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="aur_band3" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stop-color="#4CC9F0" stop-opacity="0"/>
    <stop offset="40%"  stop-color="#4CC9F0" stop-opacity="0.15"/>
    <stop offset="80%"  stop-color="#4361EE" stop-opacity="0.12"/>
    <stop offset="100%" stop-color="#4361EE" stop-opacity="0"/>
  </linearGradient>
</defs>
<rect width="1080" height="1080" fill="url(#aur_bg)"/>
<rect x="0" y="200" width="1080" height="180" fill="url(#aur_band1)" opacity="0.9" rx="0"/>
<rect x="0" y="330" width="1080" height="150" fill="url(#aur_band2)" opacity="0.8"/>
<rect x="0" y="440" width="1080" height="130" fill="url(#aur_band3)" opacity="0.9"/>
<circle cx="100" cy="100" r="1.5" fill="white" opacity="0.5"/>
<circle cx="280" cy="60"  r="1"   fill="white" opacity="0.6"/>
<circle cx="500" cy="90"  r="2"   fill="white" opacity="0.4"/>
<circle cx="720" cy="50"  r="1.5" fill="white" opacity="0.5"/>
<circle cx="900" cy="110" r="1"   fill="white" opacity="0.4"/>
<circle cx="1040" cy="70" r="2"   fill="white" opacity="0.3"/>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id:          'minimal',
    name:        'Minimal',
    description: 'Clean white with a soft dot grid',
    textColor:   '#111827',
    accentColor: '#4361EE',
    previewCss:  'linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)',

    background: () => `
<defs>
  <linearGradient id="min_bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#F8FAFC"/>
    <stop offset="100%" stop-color="#EDF2F7"/>
  </linearGradient>
</defs>
<rect width="1080" height="1080" fill="url(#min_bg)"/>
<circle cx="60"  cy="60"  r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="180" cy="60"  r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="300" cy="60"  r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="420" cy="60"  r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="540" cy="60"  r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="660" cy="60"  r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="780" cy="60"  r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="900" cy="60"  r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="1020" cy="60" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="60"  cy="180" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="180" cy="180" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="300" cy="180" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="420" cy="180" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="540" cy="180" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="660" cy="180" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="780" cy="180" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="900" cy="180" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="1020" cy="180" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="60"  cy="300" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="180" cy="300" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="300" cy="300" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="420" cy="300" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="540" cy="300" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="660" cy="300" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="780" cy="300" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="900" cy="300" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="1020" cy="300" r="1.5" fill="#CBD5E1" opacity="0.7"/>
<circle cx="60"  cy="420" r="1.5" fill="#CBD5E1" opacity="0.6"/>
<circle cx="180" cy="420" r="1.5" fill="#CBD5E1" opacity="0.6"/>
<circle cx="300" cy="420" r="1.5" fill="#CBD5E1" opacity="0.6"/>
<circle cx="420" cy="420" r="1.5" fill="#CBD5E1" opacity="0.6"/>
<circle cx="540" cy="420" r="1.5" fill="#CBD5E1" opacity="0.6"/>
<circle cx="660" cy="420" r="1.5" fill="#CBD5E1" opacity="0.6"/>
<circle cx="780" cy="420" r="1.5" fill="#CBD5E1" opacity="0.6"/>
<circle cx="900" cy="420" r="1.5" fill="#CBD5E1" opacity="0.6"/>
<circle cx="1020" cy="420" r="1.5" fill="#CBD5E1" opacity="0.6"/>
<circle cx="60"  cy="540" r="1.5" fill="#CBD5E1" opacity="0.5"/>
<circle cx="180" cy="540" r="1.5" fill="#CBD5E1" opacity="0.5"/>
<circle cx="300" cy="540" r="1.5" fill="#CBD5E1" opacity="0.5"/>
<circle cx="420" cy="540" r="1.5" fill="#CBD5E1" opacity="0.5"/>
<circle cx="540" cy="540" r="1.5" fill="#CBD5E1" opacity="0.5"/>
<circle cx="660" cy="540" r="1.5" fill="#CBD5E1" opacity="0.5"/>
<circle cx="780" cy="540" r="1.5" fill="#CBD5E1" opacity="0.5"/>
<circle cx="900" cy="540" r="1.5" fill="#CBD5E1" opacity="0.5"/>
<circle cx="1020" cy="540" r="1.5" fill="#CBD5E1" opacity="0.5"/>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id:          'obsidian-gold',
    name:        'Obsidian Gold',
    description: 'Dark luxury with gold geometric accents',
    textColor:   '#FFFFFF',
    accentColor: '#D4AF37',
    previewCss:  'linear-gradient(135deg, #0A0700 0%, #1A1100 50%, #221600 100%)',

    background: () => `
<defs>
  <linearGradient id="obs_bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#0A0700"/>
    <stop offset="50%"  stop-color="#1A1100"/>
    <stop offset="100%" stop-color="#221600"/>
  </linearGradient>
  <radialGradient id="obs_glow" cx="75%" cy="25%" r="45%">
    <stop offset="0%"   stop-color="#D4AF37" stop-opacity="0.1"/>
    <stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1080" height="1080" fill="url(#obs_bg)"/>
<rect width="1080" height="1080" fill="url(#obs_glow)"/>
<polygon points="880,80 950,160 880,240 810,160" fill="none" stroke="#D4AF37" stroke-width="1" opacity="0.3"/>
<polygon points="920,100 990,180 920,260 850,180" fill="none" stroke="#D4AF37" stroke-width="0.5" opacity="0.15"/>
<polygon points="840,60 900,130 840,200 780,130" fill="none" stroke="#D4AF37" stroke-width="0.5" opacity="0.12"/>
<line x1="810" y1="160" x2="650" y2="160" stroke="#D4AF37" stroke-width="0.5" opacity="0.18"/>
<line x1="650" y1="160" x2="650" y2="320" stroke="#D4AF37" stroke-width="0.5" opacity="0.12"/>
<polygon points="100,850 170,920 100,990 30,920" fill="none" stroke="#D4AF37" stroke-width="1" opacity="0.25"/>
<line x1="170" y1="920" x2="330" y2="920" stroke="#D4AF37" stroke-width="0.5" opacity="0.15"/>
<line x1="330" y1="920" x2="330" y2="780" stroke="#D4AF37" stroke-width="0.5" opacity="0.1"/>
<circle cx="950" cy="160" r="3" fill="#D4AF37" opacity="0.5"/>
<circle cx="100" cy="920" r="3" fill="#D4AF37" opacity="0.4"/>
<circle cx="650" cy="160" r="2" fill="#D4AF37" opacity="0.3"/>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:          'grain-bloom',
    name:        'Grain Bloom',
    description: 'Deep purple with organic noise grain texture',
    textColor:   '#FFFFFF',
    accentColor: '#E879F9',
    previewCss:  'linear-gradient(135deg, #1a0533 0%, #3a0d6e 60%, #1a0533 100%)',

    background: () => `
<defs>
  <linearGradient id="gb_bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#1a0533"/>
    <stop offset="55%"  stop-color="#3a0d6e"/>
    <stop offset="100%" stop-color="#1a0533"/>
  </linearGradient>
  <radialGradient id="gb_glow" cx="75%" cy="20%" r="50%">
    <stop offset="0%"   stop-color="#E879F9" stop-opacity="0.22"/>
    <stop offset="100%" stop-color="#E879F9" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="gb_glow2" cx="20%" cy="80%" r="45%">
    <stop offset="0%"   stop-color="#7C3AED" stop-opacity="0.18"/>
    <stop offset="100%" stop-color="#7C3AED" stop-opacity="0"/>
  </radialGradient>
  <filter id="gb_noise" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" result="noise"/>
    <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise"/>
    <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blended"/>
    <feComposite in="blended" in2="SourceGraphic" operator="in"/>
  </filter>
</defs>
<rect width="1080" height="1080" fill="url(#gb_bg)"/>
<rect width="1080" height="1080" fill="url(#gb_glow)"/>
<rect width="1080" height="1080" fill="url(#gb_glow2)"/>
<rect width="1080" height="1080" fill="#9333EA" opacity="0.02" filter="url(#gb_noise)"/>
<circle cx="870" cy="120" r="3" fill="#E879F9" opacity="0.5"/>
<circle cx="830" cy="160" r="2" fill="#E879F9" opacity="0.3"/>
<circle cx="910" cy="80"  r="1.5" fill="#E879F9" opacity="0.4"/>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:          'topographic',
    name:        'Topographic',
    description: 'Contour map with sinuous elevation lines',
    textColor:   '#FFFFFF',
    accentColor: '#38BDF8',
    previewCss:  'linear-gradient(135deg, #0a1628 0%, #0d2137 100%)',

    background: () => `
<defs>
  <linearGradient id="topo_bg" x1="0" y1="0" x2="0.3" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#0a1628"/>
    <stop offset="100%" stop-color="#0d2137"/>
  </linearGradient>
</defs>
<rect width="1080" height="1080" fill="url(#topo_bg)"/>
<path d="M-60,120 C120,98 280,140 460,112 S700,130 900,105 S1020,118 1140,108" fill="none" stroke="#38BDF8" stroke-width="1.2" opacity="0.18"/>
<path d="M-60,190 C100,175 320,210 500,185 S740,200 940,178 S1060,190 1140,180" fill="none" stroke="#38BDF8" stroke-width="1" opacity="0.15"/>
<path d="M-60,270 C150,252 300,288 520,260 S760,278 960,258 S1070,268 1140,262" fill="none" stroke="#38BDF8" stroke-width="1.5" opacity="0.2"/>
<path d="M-60,355 C130,340 350,370 540,345 S780,362 980,342 S1080,354 1140,348" fill="none" stroke="#38BDF8" stroke-width="0.8" opacity="0.13"/>
<path d="M-60,440 C170,420 340,458 560,432 S800,448 1000,428 S1080,440 1140,435" fill="none" stroke="#38BDF8" stroke-width="1.2" opacity="0.17"/>
<path d="M-60,525 C140,508 370,544 580,518 S820,535 1010,515 S1080,526 1140,520" fill="none" stroke="#38BDF8" stroke-width="1" opacity="0.14"/>
<path d="M-60,610 C160,594 340,628 580,602 S840,620 1020,600 S1090,611 1140,607" fill="none" stroke="#38BDF8" stroke-width="1.5" opacity="0.19"/>
<path d="M-60,695 C180,678 360,712 580,688 S850,704 1040,686 S1090,695 1140,692" fill="none" stroke="#38BDF8" stroke-width="0.8" opacity="0.12"/>
<path d="M-60,778 C140,762 380,798 590,772 S840,790 1040,770 S1090,780 1140,776" fill="none" stroke="#38BDF8" stroke-width="1.2" opacity="0.16"/>
<path d="M-60,862 C170,845 340,882 600,856 S860,873 1050,855 S1095,863 1140,860" fill="none" stroke="#38BDF8" stroke-width="1" opacity="0.14"/>
<path d="M-60,945 C150,930 370,965 610,940 S870,956 1055,938 S1095,946 1140,943" fill="none" stroke="#38BDF8" stroke-width="1.4" opacity="0.18"/>
<circle cx="1080" cy="50" r="2" fill="#38BDF8" opacity="0.4"/>
<circle cx="50"   cy="1040" r="2" fill="#38BDF8" opacity="0.3"/>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:          'morocco',
    name:        'Morocco',
    description: 'Islamic 8-pointed star geometric tile on deep indigo',
    textColor:   '#FFFFFF',
    accentColor: '#D4A017',
    previewCss:  'linear-gradient(135deg, #1a0a26 0%, #0f0619 100%)',

    background: () => `
<defs>
  <linearGradient id="mor_bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#1a0a26"/>
    <stop offset="100%" stop-color="#0f0619"/>
  </linearGradient>
  <pattern id="mor_tile" x="0" y="0" width="90" height="90" patternUnits="userSpaceOnUse">
    <!-- 8-pointed star (octagram) — two overlapping squares -->
    <polygon points="45,5 56,22 72,16 66,33 83,39 66,46 72,63 55,57 45,74 35,57 18,63 24,46 7,39 24,33 18,16 34,22"
             fill="none" stroke="#D4A017" stroke-width="0.9" opacity="0.3"/>
    <!-- Inner rotated square -->
    <polygon points="45,18 57,30 57,44 45,56 33,44 33,30"
             fill="none" stroke="#D4A017" stroke-width="0.6" opacity="0.18"/>
    <!-- Center diamond -->
    <polygon points="45,32 52,39 45,46 38,39"
             fill="none" stroke="#D4A017" stroke-width="0.8" opacity="0.25"/>
    <!-- Corner accent circles -->
    <circle cx="0"  cy="0"  r="3" fill="none" stroke="#D4A017" stroke-width="0.5" opacity="0.15"/>
    <circle cx="90" cy="0"  r="3" fill="none" stroke="#D4A017" stroke-width="0.5" opacity="0.15"/>
    <circle cx="0"  cy="90" r="3" fill="none" stroke="#D4A017" stroke-width="0.5" opacity="0.15"/>
    <circle cx="90" cy="90" r="3" fill="none" stroke="#D4A017" stroke-width="0.5" opacity="0.15"/>
  </pattern>
  <radialGradient id="mor_glow" cx="70%" cy="25%" r="45%">
    <stop offset="0%"   stop-color="#D4A017" stop-opacity="0.1"/>
    <stop offset="100%" stop-color="#D4A017" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1080" height="1080" fill="url(#mor_bg)"/>
<rect width="1080" height="1080" fill="url(#mor_tile)"/>
<rect width="1080" height="1080" fill="url(#mor_glow)"/>
<circle cx="540" cy="540" r="200" fill="none" stroke="#D4A017" stroke-width="0.5" opacity="0.08"/>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:          'blueprint',
    name:        'Blueprint',
    description: 'Engineering blueprint with precision technical grid',
    textColor:   '#FFFFFF',
    accentColor: '#60CBFF',
    previewCss:  'linear-gradient(135deg, #001f3f 0%, #003153 100%)',

    background: () => `
<defs>
  <linearGradient id="bp_bg" x1="0" y1="0" x2="0.2" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#001f3f"/>
    <stop offset="100%" stop-color="#003153"/>
  </linearGradient>
  <!-- Fine 20px grid -->
  <pattern id="bp_fine" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
    <line x1="0" y1="0" x2="20" y2="0" stroke="#60CBFF" stroke-width="0.25" opacity="0.18"/>
    <line x1="0" y1="0" x2="0"  y2="20" stroke="#60CBFF" stroke-width="0.25" opacity="0.18"/>
  </pattern>
  <!-- Major 100px grid -->
  <pattern id="bp_major" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
    <line x1="0" y1="0" x2="100" y2="0" stroke="#60CBFF" stroke-width="0.6" opacity="0.35"/>
    <line x1="0" y1="0" x2="0" y2="100" stroke="#60CBFF" stroke-width="0.6" opacity="0.35"/>
    <circle cx="0" cy="0" r="1.5" fill="#60CBFF" opacity="0.4"/>
  </pattern>
</defs>
<rect width="1080" height="1080" fill="url(#bp_bg)"/>
<rect width="1080" height="1080" fill="url(#bp_fine)"/>
<rect width="1080" height="1080" fill="url(#bp_major)"/>
<!-- Technical annotation arcs -->
<path d="M200,200 A120,120 0 0 1 320,200" fill="none" stroke="#60CBFF" stroke-width="0.7" opacity="0.25" stroke-dasharray="4,4"/>
<path d="M760,800 A80,80 0 0 1 840,800" fill="none" stroke="#60CBFF" stroke-width="0.7" opacity="0.2" stroke-dasharray="4,4"/>
<line x1="200" y1="190" x2="200" y2="210" stroke="#60CBFF" stroke-width="0.8" opacity="0.3"/>
<line x1="320" y1="190" x2="320" y2="210" stroke="#60CBFF" stroke-width="0.8" opacity="0.3"/>
<circle cx="260" cy="200" r="3" fill="none" stroke="#60CBFF" stroke-width="0.8" opacity="0.25"/>
<circle cx="800" cy="800" r="3" fill="none" stroke="#60CBFF" stroke-width="0.8" opacity="0.2"/>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:          'liquid-mesh',
    name:        'Liquid Mesh',
    description: 'Flowing multi-point mesh gradient in rose and violet',
    textColor:   '#1A1A2E',
    accentColor: '#DB2777',
    previewCss:  'radial-gradient(ellipse at 20% 30%, #f0abfc 0%, transparent 60%), radial-gradient(ellipse at 75% 20%, #818cf8 0%, transparent 55%), radial-gradient(ellipse at 50% 80%, #fb7185 0%, transparent 60%), linear-gradient(135deg, #fff0f6 0%, #f5f3ff 100%)',

    background: () => `
<defs>
  <radialGradient id="lm_base" cx="50%" cy="50%" r="80%">
    <stop offset="0%"   stop-color="#FDF2F8"/>
    <stop offset="100%" stop-color="#F5F3FF"/>
  </radialGradient>
  <radialGradient id="lm_1" cx="18%" cy="25%" r="55%">
    <stop offset="0%"   stop-color="#F0ABFC" stop-opacity="0.7"/>
    <stop offset="100%" stop-color="#F0ABFC" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="lm_2" cx="78%" cy="18%" r="50%">
    <stop offset="0%"   stop-color="#818CF8" stop-opacity="0.55"/>
    <stop offset="100%" stop-color="#818CF8" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="lm_3" cx="50%" cy="85%" r="55%">
    <stop offset="0%"   stop-color="#FB7185" stop-opacity="0.6"/>
    <stop offset="100%" stop-color="#FB7185" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="lm_4" cx="88%" cy="65%" r="45%">
    <stop offset="0%"   stop-color="#C084FC" stop-opacity="0.5"/>
    <stop offset="100%" stop-color="#C084FC" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="lm_5" cx="10%" cy="75%" r="40%">
    <stop offset="0%"   stop-color="#F472B6" stop-opacity="0.4"/>
    <stop offset="100%" stop-color="#F472B6" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1080" height="1080" fill="url(#lm_base)"/>
<rect width="1080" height="1080" fill="url(#lm_1)"/>
<rect width="1080" height="1080" fill="url(#lm_2)"/>
<rect width="1080" height="1080" fill="url(#lm_3)"/>
<rect width="1080" height="1080" fill="url(#lm_4)"/>
<rect width="1080" height="1080" fill="url(#lm_5)"/>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:          'holographic',
    name:        'Holographic',
    description: 'Iridescent rainbow shimmer on white',
    textColor:   '#1A1A2E',
    accentColor: '#7C3AED',
    previewCss:  'linear-gradient(135deg, #fce4ff 0%, #d4f1ff 25%, #d4ffd9 50%, #fff8c5 75%, #ffd4f0 100%)',

    background: () => `
<defs>
  <linearGradient id="holo_base" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#FAFAFA"/>
    <stop offset="100%" stop-color="#F0F0F8"/>
  </linearGradient>
  <linearGradient id="holo_a" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#FCE4FF" stop-opacity="0.8"/>
    <stop offset="35%"  stop-color="#D4F1FF" stop-opacity="0.6"/>
    <stop offset="65%"  stop-color="#D4FFD9" stop-opacity="0.6"/>
    <stop offset="100%" stop-color="#FFD4F0" stop-opacity="0.7"/>
  </linearGradient>
  <linearGradient id="holo_b" x1="1" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#FFF8C5" stop-opacity="0.7"/>
    <stop offset="40%"  stop-color="#C5E8FF" stop-opacity="0.5"/>
    <stop offset="70%"  stop-color="#FFD4E8" stop-opacity="0.6"/>
    <stop offset="100%" stop-color="#E8FFD4" stop-opacity="0.5"/>
  </linearGradient>
  <linearGradient id="holo_c" x1="0" y1="1" x2="1" y2="0" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#E0D4FF" stop-opacity="0.6"/>
    <stop offset="50%"  stop-color="#FFE0D4" stop-opacity="0.5"/>
    <stop offset="100%" stop-color="#D4FFE0" stop-opacity="0.6"/>
  </linearGradient>
</defs>
<rect width="1080" height="1080" fill="url(#holo_base)"/>
<rect width="1080" height="1080" fill="url(#holo_a)"/>
<rect width="1080" height="1080" fill="url(#holo_b)"/>
<rect width="1080" height="1080" fill="url(#holo_c)"/>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:          'bokeh-night',
    name:        'Bokeh Night',
    description: 'Dreamy cinematic light orbs on near-black',
    textColor:   '#FFFFFF',
    accentColor: '#8B5CF6',
    previewCss:  'radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.5) 0%, transparent 50%), radial-gradient(ellipse at 75% 60%, rgba(96,165,250,0.4) 0%, transparent 50%), radial-gradient(ellipse at 55% 20%, rgba(244,114,182,0.3) 0%, transparent 40%), #030014',

    background: () => `
<defs>
  <filter id="bk_blur_lg" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="35"/>
  </filter>
  <filter id="bk_blur_md" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="22"/>
  </filter>
  <filter id="bk_blur_sm" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="14"/>
  </filter>
</defs>
<rect width="1080" height="1080" fill="#030014"/>
<circle cx="300" cy="350" r="180" fill="#7C3AED" opacity="0.35" filter="url(#bk_blur_lg)"/>
<circle cx="780" cy="280" r="140" fill="#2563EB" opacity="0.3" filter="url(#bk_blur_lg)"/>
<circle cx="900" cy="700" r="160" fill="#6D28D9" opacity="0.28" filter="url(#bk_blur_lg)"/>
<circle cx="160" cy="800" r="120" fill="#1D4ED8" opacity="0.25" filter="url(#bk_blur_md)"/>
<circle cx="540" cy="200" r="100" fill="#EC4899" opacity="0.22" filter="url(#bk_blur_md)"/>
<circle cx="680" cy="880" r="90"  fill="#8B5CF6" opacity="0.3" filter="url(#bk_blur_md)"/>
<circle cx="400" cy="700" r="60"  fill="#60A5FA" opacity="0.25" filter="url(#bk_blur_sm)"/>
<circle cx="920" cy="480" r="50"  fill="#A78BFA" opacity="0.3" filter="url(#bk_blur_sm)"/>
<circle cx="200" cy="500" r="40"  fill="#EC4899" opacity="0.2" filter="url(#bk_blur_sm)"/>
<circle cx="700" cy="130" r="35"  fill="#818CF8" opacity="0.28" filter="url(#bk_blur_sm)"/>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:          'vine',
    name:        'Vine',
    description: 'Botanical leaf tile on dark forest green (WhatsApp-inspired)',
    textColor:   '#FFFFFF',
    accentColor: '#22C55E',
    previewCss:  'linear-gradient(135deg, #0b2a1a 0%, #0f3d22 100%)',

    background: () => `
<defs>
  <linearGradient id="vine_bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#0b2a1a"/>
    <stop offset="100%" stop-color="#0f3d22"/>
  </linearGradient>
  <!-- 70px botanical tile -->
  <pattern id="vine_tile" x="0" y="0" width="70" height="70" patternUnits="userSpaceOnUse">
    <!-- Main leaf -->
    <path d="M35,4 C52,10 60,22 58,35 C56,48 46,58 35,62 C24,58 14,48 12,35 C10,22 18,10 35,4Z"
          fill="none" stroke="#22C55E" stroke-width="0.8" opacity="0.2"/>
    <!-- Centre vein -->
    <line x1="35" y1="4" x2="35" y2="62" stroke="#22C55E" stroke-width="0.5" opacity="0.12"/>
    <!-- Side veins -->
    <path d="M12,30 Q25,26 35,28" fill="none" stroke="#22C55E" stroke-width="0.4" opacity="0.1"/>
    <path d="M58,30 Q45,26 35,28" fill="none" stroke="#22C55E" stroke-width="0.4" opacity="0.1"/>
    <path d="M14,42 Q27,38 35,40" fill="none" stroke="#22C55E" stroke-width="0.4" opacity="0.1"/>
    <path d="M56,42 Q43,38 35,40" fill="none" stroke="#22C55E" stroke-width="0.4" opacity="0.1"/>
    <!-- Small centre dot -->
    <circle cx="35" cy="35" r="2" fill="#22C55E" opacity="0.14"/>
    <!-- Stem connectors at tile edges -->
    <line x1="35" y1="62" x2="35" y2="70" stroke="#22C55E" stroke-width="0.5" opacity="0.1"/>
    <line x1="0"  y1="35" x2="12" y2="35" stroke="#22C55E" stroke-width="0.4" opacity="0.08"/>
    <line x1="58" y1="35" x2="70" y2="35" stroke="#22C55E" stroke-width="0.4" opacity="0.08"/>
  </pattern>
</defs>
<rect width="1080" height="1080" fill="url(#vine_bg)"/>
<rect width="1080" height="1080" fill="url(#vine_tile)"/>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:          'crystal-facets',
    name:        'Crystal Facets',
    description: 'Dark gem facets with prismatic light edges',
    textColor:   '#FFFFFF',
    accentColor: '#A78BFA',
    previewCss:  'linear-gradient(135deg, #050505 0%, #0d0d14 100%)',

    background: () => `
<defs>
  <linearGradient id="cf_bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#050505"/>
    <stop offset="100%" stop-color="#0d0d14"/>
  </linearGradient>
  <linearGradient id="cf_facet1" x1="0" y1="0" x2="1" y2="1" gradientUnits="userSpaceOnUse">
    <stop offset="0%"   stop-color="#A78BFA" stop-opacity="0.12"/>
    <stop offset="100%" stop-color="#7C3AED" stop-opacity="0.04"/>
  </linearGradient>
  <linearGradient id="cf_facet2" x1="0" y1="1" x2="1" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0%"   stop-color="#60A5FA" stop-opacity="0.1"/>
    <stop offset="100%" stop-color="#818CF8" stop-opacity="0.03"/>
  </linearGradient>
</defs>
<rect width="1080" height="1080" fill="url(#cf_bg)"/>
<!-- Large facet polygons -->
<polygon points="0,0 540,200 1080,0" fill="url(#cf_facet1)" opacity="0.8"/>
<polygon points="0,0 540,200 0,540" fill="#A78BFA" opacity="0.04"/>
<polygon points="1080,0 540,200 1080,540" fill="#7C3AED" opacity="0.05"/>
<polygon points="0,540 540,200 540,800" fill="#60A5FA" opacity="0.04"/>
<polygon points="1080,540 540,200 540,800" fill="#818CF8" opacity="0.05"/>
<polygon points="0,1080 540,800 1080,1080" fill="url(#cf_facet2)" opacity="0.7"/>
<polygon points="0,540 540,800 0,1080" fill="#A78BFA" opacity="0.04"/>
<polygon points="1080,540 540,800 1080,1080" fill="#7C3AED" opacity="0.04"/>
<!-- Edge highlight lines -->
<line x1="0" y1="0" x2="540" y2="200" stroke="#A78BFA" stroke-width="0.6" opacity="0.2"/>
<line x1="1080" y1="0" x2="540" y2="200" stroke="#60A5FA" stroke-width="0.6" opacity="0.18"/>
<line x1="540" y1="200" x2="540" y2="800" stroke="#818CF8" stroke-width="0.5" opacity="0.15"/>
<line x1="0" y1="540" x2="540" y2="200" stroke="#A78BFA" stroke-width="0.4" opacity="0.12"/>
<line x1="1080" y1="540" x2="540" y2="200" stroke="#60A5FA" stroke-width="0.4" opacity="0.12"/>
<line x1="0" y1="1080" x2="540" y2="800" stroke="#A78BFA" stroke-width="0.6" opacity="0.18"/>
<line x1="1080" y1="1080" x2="540" y2="800" stroke="#7C3AED" stroke-width="0.6" opacity="0.16"/>
<line x1="0" y1="540" x2="540" y2="800" stroke="#818CF8" stroke-width="0.4" opacity="0.1"/>
<line x1="1080" y1="540" x2="540" y2="800" stroke="#60A5FA" stroke-width="0.4" opacity="0.1"/>`,
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id:          'memphis',
    name:        'Memphis',
    description: 'Elegant retro-Memphis geometric shapes on deep coral',
    textColor:   '#FFFFFF',
    accentColor: '#FFE66D',
    previewCss:  'linear-gradient(135deg, #C0392B 0%, #E74C3C 50%, #D35400 100%)',

    background: () => `
<defs>
  <linearGradient id="mem_bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%"   stop-color="#C0392B"/>
    <stop offset="55%"  stop-color="#E74C3C"/>
    <stop offset="100%" stop-color="#D35400"/>
  </linearGradient>
</defs>
<rect width="1080" height="1080" fill="url(#mem_bg)"/>
<!-- Scattered geometric shapes — restrained, professional version -->
<circle cx="920" cy="120" r="65" fill="none" stroke="#FFE66D" stroke-width="3" opacity="0.35"/>
<circle cx="920" cy="120" r="40" fill="none" stroke="#FFE66D" stroke-width="1.5" opacity="0.2"/>
<circle cx="160" cy="900" r="80" fill="none" stroke="white" stroke-width="2" opacity="0.2"/>
<polygon points="80,80 140,80 110,30" fill="white" opacity="0.12"/>
<polygon points="980,900 1040,900 1010,840" fill="#FFE66D" opacity="0.25"/>
<rect x="860" y="700" width="40" height="40" fill="none" stroke="white" stroke-width="2" opacity="0.2" transform="rotate(20,880,720)"/>
<rect x="100" y="200" width="30" height="30" fill="none" stroke="#FFE66D" stroke-width="2" opacity="0.3" transform="rotate(15,115,215)"/>
<line x1="200" y1="100" x2="260" y2="160" stroke="white" stroke-width="2.5" opacity="0.2"/>
<line x1="250" y1="100" x2="310" y2="160" stroke="white" stroke-width="2.5" opacity="0.15"/>
<line x1="300" y1="100" x2="360" y2="160" stroke="white" stroke-width="2.5" opacity="0.1"/>
<line x1="820" y1="940" x2="880" y2="980" stroke="#FFE66D" stroke-width="2" opacity="0.2"/>
<line x1="860" y1="930" x2="920" y2="970" stroke="#FFE66D" stroke-width="2" opacity="0.15"/>
<circle cx="400" cy="950" r="10" fill="white" opacity="0.2"/>
<circle cx="440" cy="960" r="6"  fill="white" opacity="0.15"/>
<circle cx="470" cy="970" r="4"  fill="white" opacity="0.12"/>
<circle cx="650" cy="80"  r="8"  fill="#FFE66D" opacity="0.3"/>
<circle cx="690" cy="70"  r="5"  fill="#FFE66D" opacity="0.2"/>`,
  },
];

// ── Exports ───────────────────────────────────────────────────────────────────

function getById(id) {
  return PATTERNS.find((p) => p.id === id) || PATTERNS[0];
}

function listMeta() {
  return PATTERNS.map(({ id, name, description, textColor, accentColor, previewCss }) => ({
    id, name, description, textColor, accentColor, previewCss,
  }));
}

module.exports = { PATTERNS, getById, listMeta };

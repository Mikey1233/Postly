/** Client-side pattern metadata. IDs must match server/services/carousel/patterns.js */

export interface CarouselPattern {
  id:          string
  name:        string
  description: string
  textColor:   string   // colour for text rendered ON the pattern (white or dark)
  accentColor: string
  previewCss:  string   // CSS `background` value used in the picker thumbnail
}

export const CAROUSEL_PATTERNS: CarouselPattern[] = [
  {
    id:          'deep-ocean',
    name:        'Deep Ocean',
    description: 'Dark teal depths with glowing arcs',
    textColor:   '#FFFFFF',
    accentColor: '#78CFF7',
    previewCss:  'linear-gradient(135deg, #001524 0%, #0E4A54 60%, #15616D 100%)',
  },
  {
    id:          'cosmic',
    name:        'Cosmic',
    description: 'Deep space with stardust and geometry',
    textColor:   '#FFFFFF',
    accentColor: '#B57BFF',
    previewCss:  'linear-gradient(135deg, #050010 0%, #0E0025 50%, #1A003A 100%)',
  },
  {
    id:          'ember',
    name:        'Ember',
    description: 'Fiery sunset with diagonal light rays',
    textColor:   '#FFFFFF',
    accentColor: '#FFD166',
    previewCss:  'linear-gradient(135deg, #1A0200 0%, #8B1A00 45%, #D62B00 75%, #FF6B35 100%)',
  },
  {
    id:          'forest-night',
    name:        'Forest Night',
    description: 'Rich emerald darkness with hex texture',
    textColor:   '#FFFFFF',
    accentColor: '#52B788',
    previewCss:  'linear-gradient(135deg, #081410 0%, #102B22 50%, #1B4332 100%)',
  },
  {
    id:          'circuit',
    name:        'Circuit',
    description: 'Dark tech grid with neon pulse',
    textColor:   '#FFFFFF',
    accentColor: '#00F0FF',
    previewCss:  'linear-gradient(135deg, #010B18 0%, #020D20 100%)',
  },
  {
    id:          'aurora',
    name:        'Aurora',
    description: 'Northern lights sweeping across dark sky',
    textColor:   '#FFFFFF',
    accentColor: '#C77DFF',
    previewCss:  'linear-gradient(135deg, #0A0020 0%, #15003A 40%, #0A0030 70%, #001A40 100%)',
  },
  {
    id:          'minimal',
    name:        'Minimal',
    description: 'Clean white with a soft dot grid',
    textColor:   '#111827',
    accentColor: '#4361EE',
    previewCss:  'linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)',
  },
  {
    id:          'obsidian-gold',
    name:        'Obsidian Gold',
    description: 'Dark luxury with gold geometric accents',
    textColor:   '#FFFFFF',
    accentColor: '#D4AF37',
    previewCss:  'linear-gradient(135deg, #0A0700 0%, #1A1100 50%, #221600 100%)',
  },

  // ── New patterns ──────────────────────────────────────────────────────────
  {
    id:          'grain-bloom',
    name:        'Grain Bloom',
    description: 'Deep purple with organic noise grain texture',
    textColor:   '#FFFFFF',
    accentColor: '#E879F9',
    previewCss:  'linear-gradient(135deg, #1a0533 0%, #3a0d6e 60%, #1a0533 100%)',
  },
  {
    id:          'topographic',
    name:        'Topographic',
    description: 'Contour map with sinuous elevation lines',
    textColor:   '#FFFFFF',
    accentColor: '#38BDF8',
    previewCss:  'linear-gradient(135deg, #0a1628 0%, #0d2137 100%)',
  },
  {
    id:          'morocco',
    name:        'Morocco',
    description: 'Islamic 8-pointed star geometric tile',
    textColor:   '#FFFFFF',
    accentColor: '#D4A017',
    previewCss:  'linear-gradient(135deg, #1a0a26 0%, #0f0619 100%)',
  },
  {
    id:          'blueprint',
    name:        'Blueprint',
    description: 'Engineering blueprint with precision technical grid',
    textColor:   '#FFFFFF',
    accentColor: '#60CBFF',
    previewCss:  'linear-gradient(135deg, #001f3f 0%, #003153 100%)',
  },
  {
    id:          'liquid-mesh',
    name:        'Liquid Mesh',
    description: 'Flowing multi-point mesh gradient in rose and violet',
    textColor:   '#1A1A2E',
    accentColor: '#DB2777',
    previewCss:  'radial-gradient(ellipse at 20% 30%, #f0abfc 0%, transparent 60%), radial-gradient(ellipse at 75% 20%, #818cf8 0%, transparent 55%), radial-gradient(ellipse at 50% 80%, #fb7185 0%, transparent 60%), linear-gradient(135deg, #fff0f6 0%, #f5f3ff 100%)',
  },
  {
    id:          'holographic',
    name:        'Holographic',
    description: 'Iridescent rainbow shimmer on white',
    textColor:   '#1A1A2E',
    accentColor: '#7C3AED',
    previewCss:  'linear-gradient(135deg, #fce4ff 0%, #d4f1ff 25%, #d4ffd9 50%, #fff8c5 75%, #ffd4f0 100%)',
  },
  {
    id:          'bokeh-night',
    name:        'Bokeh Night',
    description: 'Dreamy cinematic light orbs on near-black',
    textColor:   '#FFFFFF',
    accentColor: '#8B5CF6',
    previewCss:  'radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.6) 0%, transparent 50%), radial-gradient(ellipse at 75% 60%, rgba(96,165,250,0.5) 0%, transparent 50%), #030014',
  },
  {
    id:          'vine',
    name:        'Vine',
    description: 'Botanical leaf tile on dark forest green',
    textColor:   '#FFFFFF',
    accentColor: '#22C55E',
    previewCss:  'linear-gradient(135deg, #0b2a1a 0%, #0f3d22 100%)',
  },
  {
    id:          'crystal-facets',
    name:        'Crystal Facets',
    description: 'Dark gem facets with prismatic light edges',
    textColor:   '#FFFFFF',
    accentColor: '#A78BFA',
    previewCss:  'linear-gradient(135deg, #050505 0%, #0d0d14 100%)',
  },
  {
    id:          'memphis',
    name:        'Memphis',
    description: 'Elegant retro-Memphis geometric shapes on coral',
    textColor:   '#FFFFFF',
    accentColor: '#FFE66D',
    previewCss:  'linear-gradient(135deg, #C0392B 0%, #E74C3C 50%, #D35400 100%)',
  },
]

export function getPatternById(id: string): CarouselPattern {
  return CAROUSEL_PATTERNS.find((p) => p.id === id) ?? CAROUSEL_PATTERNS[0]
}

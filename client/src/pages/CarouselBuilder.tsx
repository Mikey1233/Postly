import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useShallow } from 'zustand/react/shallow'
import useAppStore from '../store/useAppStore'
import type { SlideData, CarouselTheme } from '../store/useAppStore'
import {
  CAROUSEL_PATTERNS,
  getPatternById,
  type CarouselPattern,
} from '../lib/carouselPatterns'

// ── Types ─────────────────────────────────────────────────────────────────────

type SlideType = SlideData['type']

const CONTENT_GOALS   = ['Educate', 'Build authority', 'Drive comments', 'Generate leads', 'Sell'] as const
const CAROUSEL_FONTS = [
  { id: 'Poppins',           name: 'Poppins'  },
  { id: 'Space Grotesk',     name: 'Grotesk'  },
  { id: 'Plus Jakarta Sans', name: 'Jakarta'  },
  { id: 'Syne',              name: 'Syne'     },
  { id: 'Outfit',            name: 'Outfit'   },
  { id: 'DM Sans',           name: 'DM Sans'  },
] as const

const CAROUSEL_FORMATS = [
  { value: 'auto',      label: 'Auto'      },
  { value: 'checklist', label: 'Checklist' },
  { value: 'framework', label: 'Framework' },
  { value: 'mistake',   label: 'Mistake'   },
] as const

interface CarouselListItem {
  id:               string
  title:            string
  slide_count:      number | null
  slides:           SlideData[] | null
  pdf_storage_path: string | null
  ai_generated:     boolean
  created_at:       string
}

// ── CSS-based slide preview (matches the chosen pattern) ─────────────────────

function SlidePreviewCSS({
  slide, pattern, fontFamily = 'Poppins', fontScale = 1.0, padding = 7,
}: {
  slide:       SlideData
  pattern:     CarouselPattern
  fontFamily?: string
  fontScale?:  number
  padding?:    number
}) {
  const tc  = pattern.textColor
  const ac  = pattern.accentColor
  const f   = (pct: number) => `${(pct * fontScale).toFixed(2)}%`
  const pad = `${padding}%`

  const base: React.CSSProperties = {
    background:  pattern.previewCss,
    color:       tc,
    width:       '100%',
    aspectRatio: '1/1',
    position:    'relative',
    overflow:    'hidden',
    fontFamily:  `'${fontFamily}', 'Poppins', system-ui, sans-serif`,
  }

  const hl: React.CSSProperties = {
    fontWeight:    900,
    lineHeight:    1.1,
    letterSpacing: '-0.02em',
  }

  if (slide.type === 'cover') return (
    <div style={base}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '11%', background: ac, opacity: 0.92 }} />
      <div style={{ position: 'absolute', bottom: '11%', left: pad, width: '8%', height: '0.5%', background: ac }} />
      <div style={{ padding: pad, paddingBottom: `${padding + 11}%` }}>
        <p style={{ ...hl, fontSize: f(7.5), color: tc, marginBottom: '3.5%' }}>{slide.headline}</p>
        {slide.subtext && (
          <p style={{ fontSize: f(2.9), fontWeight: 600, color: ac, lineHeight: 1.4 }}>{slide.subtext}</p>
        )}
      </div>
    </div>
  )

  if (slide.type === 'stat') return (
    <div style={{ ...base, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: pad }}>
      <p style={{ fontSize: f(17), fontWeight: 900, color: ac, lineHeight: 1, letterSpacing: '-0.03em' }}>{slide.statNumber}</p>
      {slide.statLabel && (
        <p style={{ fontSize: f(3.6), fontWeight: 700, color: tc, textAlign: 'center', marginTop: '2%', letterSpacing: '-0.01em' }}>{slide.statLabel}</p>
      )}
      {slide.body && (
        <p style={{ fontSize: f(2.5), color: tc, textAlign: 'center', marginTop: '1.5%', opacity: 0.7 }}>{slide.body}</p>
      )}
    </div>
  )

  if (slide.type === 'quote') return (
    <div style={{ ...base, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: pad }}>
      <p style={{ fontSize: f(16), fontWeight: 900, color: ac, opacity: 0.12, lineHeight: 0.6, alignSelf: 'flex-start', fontStyle: 'italic' }}>"</p>
      <p style={{ fontSize: f(4.4), fontWeight: 700, color: tc, textAlign: 'center', lineHeight: 1.45, marginTop: '-3%', letterSpacing: '-0.01em' }}>{slide.quote}</p>
      {slide.attribution && (
        <p style={{ fontSize: f(2.6), fontWeight: 600, color: ac, marginTop: '4%', letterSpacing: '0.02em' }}>— {slide.attribution}</p>
      )}
    </div>
  )

  if (slide.type === 'cta') return (
    <div style={{ ...base, background: ac, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: pad, gap: '3%' }}>
      <p style={{ ...hl, fontSize: f(6.5), color: '#fff', textAlign: 'center' }}>{slide.headline}</p>
      {slide.body && (
        <p style={{ fontSize: f(2.9), color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 1.55 }}>{slide.body}</p>
      )}
    </div>
  )

  return (
    <div style={base}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '1.4%', background: ac }} />
      <div style={{ padding: `${pad} ${pad} ${pad} ${padding + 2.5}%` }}>
        <p style={{ ...hl, fontSize: f(6), color: tc, marginBottom: '4%' }}>{slide.headline}</p>
        {slide.body && (
          <p style={{ fontSize: f(2.8), color: tc, lineHeight: 1.65, opacity: 0.88 }}>{slide.body}</p>
        )}
        {(slide.bulletPoints || []).map((bp, i) => (
          <p key={i} style={{ fontSize: f(2.6), fontWeight: 500, marginTop: '2%', color: tc, opacity: 0.83 }}>• {bp}</p>
        ))}
      </div>
    </div>
  )
}

// ── Pattern picker card ───────────────────────────────────────────────────────

function PatternCard({
  pattern, selected, onClick,
}: { pattern: CarouselPattern; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative shrink-0 w-32 h-32 rounded-2xl overflow-hidden transition-all duration-200 group ${
        selected
          ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-950 scale-105'
          : 'ring-1 ring-white/10 hover:ring-white/30 hover:scale-102'
      }`}
      style={{ background: pattern.previewCss }}
    >
      {/* Overlay label */}
      <div className={`absolute inset-0 flex flex-col items-center justify-end pb-3 transition-all ${
        selected ? 'bg-black/20' : 'bg-black/30 group-hover:bg-black/20'
      }`}>
        <span className="text-white text-xs font-semibold tracking-wide drop-shadow">{pattern.name}</span>
        {selected && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-gray-900">
              <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"/>
            </svg>
          </div>
        )}
      </div>
    </button>
  )
}

// ── Slide thumbnail in the strip ─────────────────────────────────────────────

function SlideThumbnail({
  slide, pattern, imageUrl, index, active, roleLabel, padding, onClick, onDelete,
}: {
  slide:      SlideData
  pattern:    CarouselPattern
  imageUrl?:  string
  index:      number
  active:     boolean
  roleLabel:  string
  padding?:   number
  onClick:    () => void
  onDelete:   () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`relative shrink-0 w-24 rounded-xl overflow-hidden border-2 transition-all ${
        active ? 'border-white scale-105 shadow-lg shadow-white/10' : 'border-white/10 hover:border-white/30'
      }`}
    >
      <div className="w-full aspect-square">
        {imageUrl
          ? <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          : <SlidePreviewCSS slide={slide} pattern={pattern} padding={padding} />}
      </div>
      <div className="absolute top-1 left-1">
        <span className="text-[8px] font-bold bg-black/50 text-white px-1 py-0.5 rounded">
          {roleLabel}
        </span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="absolute top-1 right-1 w-4 h-4 bg-black/50 hover:bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] transition-colors"
      >×</button>
    </button>
  )
}

const SLIDE_ROLES = ['Hook', 'Setup', 'Pain', 'Value', 'Value', 'Value', 'Value', 'Aha', 'Takeaway', 'CTA']
function getRoleLabel(slide: SlideData, index: number): string {
  if (slide.type === 'cover')  return 'Hook'
  if (slide.type === 'cta')    return 'CTA'
  if (slide.type === 'stat')   return 'Stat'
  if (slide.type === 'quote')  return 'Quote'
  return SLIDE_ROLES[Math.min(index, SLIDE_ROLES.length - 1)] ?? `${index + 1}`
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CarouselBuilder() {
  const {
    carouselEditor, setCarouselEditor, setActiveSlide, addSlide, removeSlide,
    setSlides, selectedModel,
  } = useAppStore(useShallow((s) => ({
    carouselEditor:    s.carouselEditor,
    setCarouselEditor: s.setCarouselEditor,
    setActiveSlide:    s.setActiveSlide,
    addSlide:          s.addSlide,
    removeSlide:       s.removeSlide,
    setSlides:         s.setSlides,
    selectedModel:     s.selectedModel,
  })))

  const { slides, theme, activeSlideIndex, title, id } = carouselEditor
  const activeSlide = slides[activeSlideIndex]

  // ── Local state ─────────────────────────────────────────────────────────────

  const [selectedPattern, setSelectedPattern] = useState<CarouselPattern>(CAROUSEL_PATTERNS[0])
  const [slideImages, setSlideImages]   = useState<string[]>([])
  const [pdfUrl, setPdfUrl]             = useState<string | null>(null)
  const [caption, setCaption]           = useState('')
  const [generating, setGenerating]     = useState(false)
  const [rendering, setRendering]       = useState(false)
  const [publishing, setPublishing]     = useState(false)
  const [genStep, setGenStep]           = useState('')
  const [showEditPanel, setShowEditPanel] = useState(false)

  // Generate form
  const [genTopic,    setGenTopic]    = useState('')
  const [genAudience, setGenAudience] = useState('')
  const [genGoal,     setGenGoal]     = useState<string>('Educate')
  const [genFormat,   setGenFormat]   = useState<string>('auto')
  const [genCTA,      setGenCTA]      = useState('')

  // Library
  const [showLibrary, setShowLibrary]         = useState(false)
  const [library, setLibrary]                 = useState<CarouselListItem[]>([])
  const [libraryLoading, setLibraryLoading]   = useState(false)
  const [publishingIds, setPublishingIds]     = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds]         = useState<Set<string>>(new Set())

  const stripRef = useRef<HTMLDivElement>(null)

  // Load templates on mount (kept for template usage)
  useEffect(() => {
    api.get('/api/carousel/templates').catch(() => {})
  }, [])

  // Cycle gen step messages while generating
  useEffect(() => {
    if (!generating) { setGenStep(''); return }
    const steps = ['Crafting viral hooks…', 'Building story arc…', 'Writing the save moment…', 'Generating caption…']
    let i = 0; setGenStep(steps[0])
    const t = setInterval(() => { i = (i + 1) % steps.length; setGenStep(steps[i]) }, 2800)
    return () => clearInterval(t)
  }, [generating])

  // Auto-scroll strip when active slide changes
  useEffect(() => {
    const el = stripRef.current?.children[activeSlideIndex] as HTMLElement
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeSlideIndex])

  // ── Generation ───────────────────────────────────────────────────────────────

  const generate = async () => {
    if (!genTopic.trim()) { toast.error('Enter a topic'); return }
    setGenerating(true)
    try {
      const { data } = await api.post<{
        carousel: { id: string }
        slides:   SlideData[]
        caption:  string
        pdfUrl:   string
      }>('/api/carousel/generate-full', {
        topic:          genTopic.trim(),
        targetAudience: genAudience.trim() || undefined,
        contentGoal:    genGoal,
        format:         genFormat,
        ctaKeyword:     genCTA.trim() || undefined,
        model:          selectedModel,
      })
      setSlides(data.slides)
      setCarouselEditor({ id: data.carousel.id, title: genTopic.trim(), isDirty: false })
      setCaption(data.caption)
      setSlideImages([])
      setPdfUrl(null)
      setActiveSlide(0)
      // Auto-render with chosen pattern
      await renderWithPattern(data.carousel.id, data.slides)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      toast.error(msg || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  // Wrapper around updateSlide that also drops the rendered PNGs so the live
  // CSS preview becomes visible again — user sees changes as they type.
  // Clicking "Re-render" will produce fresh PNGs from the edited content.
  // Any content or style change drops the rendered PNGs → live CSS preview shows immediately.
  // User hits "Re-render" when ready to produce new PNGs.
  const editSlide = (index: number, patch: Partial<SlideData>) => {
    useAppStore.getState().updateSlide(index, patch)
    if (slideImages.length > 0) setSlideImages([])
  }

  const editTheme = (patch: Partial<CarouselTheme>) => {
    useAppStore.getState().updateCarouselTheme(patch)
    if (slideImages.length > 0) setSlideImages([])
  }

  const renderWithPattern = async (carouselId?: string, _slides?: SlideData[]) => {
    const cid = carouselId || id
    if (!cid) {
      // Save first
      try {
        const { data } = await api.post('/api/carousel', {
          title: title || 'Untitled', slides, aiGenerated: true,
        })
        setCarouselEditor({ id: data.id, isDirty: false })
        await doRender(data.id)
      } catch { toast.error('Save failed') }
      return
    }
    await doRender(cid)
  }

  const doRender = async (carouselId: string) => {
    setRendering(true)
    try {
      const { data } = await api.post<{
        slides:         SlideData[]
        slideImageUrls: string[]
        pdfUrl:         string
        patternId:      string
      }>(`/api/carousel/${carouselId}/render`, {
        patternId:  selectedPattern.id,
        fontFamily: theme.font       || 'Poppins',
        fontScale:  theme.fontScale  ?? 1.0,
        padding:    theme.padding    ?? 7,
      })
      setSlides(data.slides)
      setSlideImages(data.slideImageUrls)
      setPdfUrl(data.pdfUrl)
      setCarouselEditor({ isDirty: false })
      toast.success(`Rendered with ${selectedPattern.name} · PDF ready`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      toast.error(msg || 'Render failed')
    } finally {
      setRendering(false)
    }
  }

  // ── Publish ──────────────────────────────────────────────────────────────────

  const publish = async () => {
    if (!id) { toast.error('Generate a carousel first'); return }

    if (!pdfUrl) {
      setPdfUrl(null)
      setRendering(true)
      try {
        const { data } = await api.post<{ pdfUrl: string }>(`/api/carousel/${id}/pdf`)
        setPdfUrl(data.pdfUrl)
      } catch { toast.error('PDF generation failed'); setRendering(false); return }
      setRendering(false)
    }

    setPublishing(true)
    try {
      await api.post(`/api/carousel/${id}/publish`, { caption })
      toast.success('Posted to LinkedIn!')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      toast.error(msg || 'Publish failed — check LinkedIn is connected')
    } finally { setPublishing(false) }
  }

  // ── Library ──────────────────────────────────────────────────────────────────

  const openLibrary = async () => {
    setShowLibrary(true); setLibraryLoading(true)
    try { const { data } = await api.get<CarouselListItem[]>('/api/carousel'); setLibrary(data) }
    catch { toast.error('Failed to load library') }
    finally { setLibraryLoading(false) }
  }

  const loadIntoEditor = (item: CarouselListItem) => {
    if (!item.slides?.length) { toast.error('No slides in this carousel'); return }
    setSlides(item.slides)
    setCarouselEditor({ id: item.id, title: item.title, isDirty: false })
    setSlideImages([]); setPdfUrl(null); setActiveSlide(0)
    setShowLibrary(false)
    toast.success(`Loaded: ${item.title}`)
  }

  const deleteFromLibrary = async (item: CarouselListItem) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    setDeletingIds((p) => new Set(p).add(item.id))
    try {
      await api.delete(`/api/carousel/${item.id}`)
      setLibrary((p) => p.filter((c) => c.id !== item.id))
      if (id === item.id) { setCarouselEditor({ id: null, title: '', isDirty: false }); setSlides([]); setPdfUrl(null); setSlideImages([]) }
      toast.success('Deleted')
    } catch { toast.error('Delete failed') }
    finally { setDeletingIds((p) => { const n = new Set(p); n.delete(item.id); return n }) }
  }

  const publishFromLibrary = async (item: CarouselListItem) => {
    if (!item.pdf_storage_path) { toast.error('No PDF — load it and render first'); return }
    setPublishingIds((p) => new Set(p).add(item.id))
    try {
      await api.post(`/api/carousel/${item.id}/publish`, { caption: item.title })
      toast.success(`Posted "${item.title}"`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      toast.error(msg || 'Publish failed')
    } finally { setPublishingIds((p) => { const n = new Set(p); n.delete(item.id); return n }) }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const hasSlides   = slides.length > 0
  const hasRendered = slideImages.length > 0

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-white/8 bg-gray-950/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <input
            value={title}
            onChange={(e) => setCarouselEditor({ title: e.target.value })}
            placeholder="Untitled carousel…"
            className="bg-transparent text-white text-base font-semibold placeholder-white/30 focus:outline-none border-b border-transparent focus:border-white/30 transition-colors min-w-0 max-w-xs"
          />
          {hasRendered && (
            <span className="text-xs text-white/40 shrink-0">
              {selectedPattern.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={openLibrary} className="text-xs text-white/60 hover:text-white border border-white/10 hover:border-white/30 rounded-lg px-3 py-1.5 transition-colors">
            My Carousels
          </button>
          {hasSlides && (
            <button
              onClick={() => renderWithPattern()}
              disabled={rendering || generating}
              className="text-xs border border-white/20 text-white/80 hover:text-white hover:border-white/40 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {rendering
                ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />Rendering…</>
                : '⚙ Re-render'}
            </button>
          )}
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg px-3 py-1.5 hover:bg-emerald-500/15 transition-colors">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />PDF ready ↗
            </a>
          )}
          <button
            onClick={publish}
            disabled={publishing || rendering || !hasSlides}
            className="text-xs bg-[#0A66C2] hover:bg-[#0958a8] disabled:opacity-40 text-white font-medium rounded-lg px-4 py-1.5 transition-colors"
          >
            {publishing ? 'Posting…' : 'Post to LinkedIn'}
          </button>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      {!hasSlides ? (

        /* ── Creation view ─────────────────────────────────────────────────── */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">

            {/* Pattern gallery */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Choose a background</h2>
              <p className="text-sm text-white/40 mb-5">This becomes the visual design of every slide.</p>
              <div className="flex gap-3 flex-wrap">
                {CAROUSEL_PATTERNS.map((p) => (
                  <PatternCard
                    key={p.id}
                    pattern={p}
                    selected={selectedPattern.id === p.id}
                    onClick={() => setSelectedPattern(p)}
                  />
                ))}
              </div>
            </div>

            {/* Generate form */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">What's your carousel about?</h2>

              <div>
                <label className="text-xs text-white/50 block mb-1.5">Topic *</label>
                <textarea
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="e.g. 5 mistakes most managers make in their first year — and how to avoid them"
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none resize-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 block mb-1.5">Audience</label>
                  <input
                    value={genAudience}
                    onChange={(e) => setGenAudience(e.target.value)}
                    placeholder="e.g. SaaS founders"
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1.5">CTA Keyword</label>
                  <input
                    value={genCTA}
                    onChange={(e) => setGenCTA(e.target.value)}
                    placeholder="e.g. BLUEPRINT"
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Goal pills */}
              <div>
                <label className="text-xs text-white/50 block mb-2">Goal</label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_GOALS.map((g) => (
                    <button key={g} onClick={() => setGenGoal(g)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        genGoal === g
                          ? 'bg-white text-gray-900 border-white font-medium'
                          : 'border-white/15 text-white/60 hover:border-white/30 hover:text-white/80'
                      }`}
                    >{g}</button>
                  ))}
                </div>
              </div>

              {/* Format pills */}
              <div>
                <label className="text-xs text-white/50 block mb-2">Format</label>
                <div className="flex gap-2">
                  {CAROUSEL_FORMATS.map((f) => (
                    <button key={f.value} onClick={() => setGenFormat(f.value)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        genFormat === f.value
                          ? 'bg-white text-gray-900 border-white font-medium'
                          : 'border-white/15 text-white/60 hover:border-white/30 hover:text-white/80'
                      }`}
                    >{f.label}</button>
                  ))}
                </div>
              </div>

              {/* Generate button — shows pattern preview */}
              <button
                onClick={generate}
                disabled={generating || !genTopic.trim()}
                className="w-full relative overflow-hidden rounded-2xl py-4 text-sm font-semibold text-white disabled:opacity-40 transition-all group"
                style={{ background: selectedPattern.previewCss }}
              >
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                <span className="relative flex items-center justify-center gap-2">
                  {generating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {genStep}
                    </>
                  ) : (
                    <>✨ Generate with {selectedPattern.name}</>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>

      ) : (

        /* ── Slide viewer ───────────────────────────────────────────────────── */
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Slide strip */}
          <div className="shrink-0 px-4 py-3 border-b border-white/8 bg-gray-900/50">
            <div ref={stripRef} className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              {slides.map((slide, i) => (
                <SlideThumbnail
                  key={i}
                  slide={slide}
                  pattern={selectedPattern}
                  imageUrl={slideImages[i]}
                  index={i}
                  active={activeSlideIndex === i}
                  roleLabel={getRoleLabel(slide, i)}
                  padding={theme.padding}
                  onClick={() => setActiveSlide(i)}
                  onDelete={() => removeSlide(i)}
                />
              ))}
              {/* Add slide button */}
              <button
                onClick={() => addSlide({ order: slides.length + 1, type: 'content', headline: '' })}
                className="shrink-0 w-24 aspect-square rounded-xl border-2 border-dashed border-white/15 hover:border-white/30 flex items-center justify-center text-white/30 hover:text-white/60 text-2xl transition-colors"
              >+</button>
            </div>
          </div>

          {/* Main area: preview + edit */}
          <div className="flex-1 flex overflow-hidden">

            {/* Canvas */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 min-w-0">
              {activeSlide && (
                <>
                  <div className="w-full max-w-sm shadow-2xl shadow-black/50 rounded-2xl overflow-hidden ring-1 ring-white/10">
                    {slideImages[activeSlideIndex]
                      ? <img src={slideImages[activeSlideIndex]} alt="" className="w-full aspect-square object-cover" />
                      : <SlidePreviewCSS slide={activeSlide} pattern={selectedPattern} fontFamily={theme.font} fontScale={theme.fontScale} padding={theme.padding} />}
                  </div>
                  {/* Prev / Next */}
                  <div className="flex items-center gap-4 mt-4 text-white/40 text-sm">
                    <button onClick={() => activeSlideIndex > 0 && setActiveSlide(activeSlideIndex - 1)} disabled={activeSlideIndex === 0} className="hover:text-white disabled:opacity-20 transition-colors">← Prev</button>
                    <span>{activeSlideIndex + 1} / {slides.length}</span>
                    <button onClick={() => activeSlideIndex < slides.length - 1 && setActiveSlide(activeSlideIndex + 1)} disabled={activeSlideIndex === slides.length - 1} className="hover:text-white disabled:opacity-20 transition-colors">Next →</button>
                  </div>
                  <button
                    onClick={() => setShowEditPanel((v) => !v)}
                    className="mt-3 text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/25 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {showEditPanel ? 'Hide editor' : 'Edit slide'}
                  </button>
                </>
              )}
            </div>

            {/* Edit panel */}
            {showEditPanel && activeSlide && (
              <div className="w-72 shrink-0 border-l border-white/8 bg-gray-900/80 overflow-y-auto p-4 space-y-4">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Edit Slide</h3>

                {['cover', 'content', 'cta'].includes(activeSlide.type) && (
                  <div>
                    <label className="text-xs text-white/50 block mb-1">Headline</label>
                    <input value={activeSlide.headline || ''} onChange={(e) => editSlide(activeSlideIndex, { headline: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                  </div>
                )}
                {activeSlide.type === 'cover' && (
                  <div>
                    <label className="text-xs text-white/50 block mb-1">Subtext</label>
                    <input value={activeSlide.subtext || ''} onChange={(e) => editSlide(activeSlideIndex, { subtext: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                  </div>
                )}
                {['content', 'cta', 'stat'].includes(activeSlide.type) && (
                  <div>
                    <label className="text-xs text-white/50 block mb-1">Body</label>
                    <textarea value={activeSlide.body || ''} rows={3} onChange={(e) => editSlide(activeSlideIndex, { body: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none" />
                  </div>
                )}
                {activeSlide.type === 'quote' && (
                  <>
                    <div>
                      <label className="text-xs text-white/50 block mb-1">Quote</label>
                      <textarea value={activeSlide.quote || ''} rows={3} onChange={(e) => editSlide(activeSlideIndex, { quote: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none" />
                    </div>
                    <div>
                      <label className="text-xs text-white/50 block mb-1">Attribution</label>
                      <input value={activeSlide.attribution || ''} onChange={(e) => editSlide(activeSlideIndex, { attribution: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                    </div>
                  </>
                )}
                {activeSlide.type === 'stat' && (
                  <>
                    <div>
                      <label className="text-xs text-white/50 block mb-1">Stat Number</label>
                      <input value={activeSlide.statNumber || ''} onChange={(e) => editSlide(activeSlideIndex, { statNumber: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-white/50 block mb-1">Stat Label</label>
                      <input value={activeSlide.statLabel || ''} onChange={(e) => editSlide(activeSlideIndex, { statLabel: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                    </div>
                  </>
                )}

                {/* Font family */}
                <div>
                  <label className="text-xs text-white/50 block mb-2">Font</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CAROUSEL_FONTS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => editTheme({ font: f.id })}
                        style={{ fontFamily: `'${f.id}', sans-serif` }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                          (theme.font || 'Poppins') === f.id
                            ? 'bg-white text-gray-900 border-white font-semibold'
                            : 'border-white/15 text-white/60 hover:border-white/30 hover:text-white'
                        }`}
                      >{f.name}</button>
                    ))}
                  </div>
                </div>

                {/* Font size */}
                <div>
                  <label className="text-xs text-white/50 block mb-2">Font Size</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => editTheme({ fontScale: Math.max(0.75, Math.round(((theme.fontScale ?? 1.0) - 0.1) * 10) / 10) })}
                      className="w-8 h-8 border border-white/15 hover:border-white/35 rounded-lg text-white text-lg flex items-center justify-center transition-colors"
                    >−</button>
                    <span className="text-sm text-white/80 w-12 text-center font-mono tabular-nums">
                      {Math.round((theme.fontScale ?? 1.0) * 100)}%
                    </span>
                    <button
                      onClick={() => editTheme({ fontScale: Math.min(1.5, Math.round(((theme.fontScale ?? 1.0) + 0.1) * 10) / 10) })}
                      className="w-8 h-8 border border-white/15 hover:border-white/35 rounded-lg text-white text-lg flex items-center justify-center transition-colors"
                    >+</button>
                  </div>
                </div>

                {/* Padding */}
                <div>
                  <label className="text-xs text-white/50 block mb-2">Padding</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => editTheme({ padding: Math.max(3, (theme.padding ?? 7) - 1) })}
                      className="w-8 h-8 border border-white/15 hover:border-white/35 rounded-lg text-white text-lg flex items-center justify-center transition-colors"
                    >−</button>
                    <span className="text-sm text-white/80 w-12 text-center font-mono tabular-nums">
                      {theme.padding ?? 7}%
                    </span>
                    <button
                      onClick={() => editTheme({ padding: Math.min(15, (theme.padding ?? 7) + 1) })}
                      className="w-8 h-8 border border-white/15 hover:border-white/35 rounded-lg text-white text-lg flex items-center justify-center transition-colors"
                    >+</button>
                  </div>
                </div>

                {/* Switch pattern in edit panel too */}
                <div>
                  <label className="text-xs text-white/50 block mb-2">Background</label>
                  <div className="flex flex-wrap gap-2">
                    {CAROUSEL_PATTERNS.map((p) => (
                      <button key={p.id} onClick={() => { setSelectedPattern(p); if (slideImages.length > 0) setSlideImages([]) }}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${selectedPattern.id === p.id ? 'border-white scale-110' : 'border-transparent hover:border-white/40'}`}
                        style={{ background: p.previewCss }} title={p.name} />
                    ))}
                  </div>
                </div>

                {/* Caption */}
                <div>
                  <label className="text-xs text-white/50 block mb-1">LinkedIn Caption</label>
                  <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={5}
                    placeholder="Post caption…"
                    className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none placeholder-white/25" />
                </div>

                <button
                  onClick={() => renderWithPattern()}
                  disabled={rendering}
                  style={{ background: selectedPattern.previewCss }}
                  className="w-full relative overflow-hidden rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-40 transition-all"
                >
                  <div className="absolute inset-0 bg-black/30" />
                  <span className="relative">
                    {rendering ? 'Rendering…' : `Re-render with ${selectedPattern.name}`}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Start over button when slides exist ─────────────────────────────── */}
      {hasSlides && (
        <div className="shrink-0 px-6 py-2 border-t border-white/8 bg-gray-950/80 flex items-center gap-3">
          <button
            onClick={() => {
              setCarouselEditor({ id: null, title: '', isDirty: false })
              setSlides([]); setSlideImages([]); setPdfUrl(null); setCaption('')
            }}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >← New carousel</button>
          <span className="text-white/10">|</span>
          {rendering && (
            <span className="text-xs text-white/40 flex items-center gap-1.5">
              <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              Rendering slides…
            </span>
          )}
        </div>
      )}

      {/* ── Carousel Library drawer ──────────────────────────────────────────── */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLibrary(false)} />
          <div className="relative w-full max-w-sm bg-gray-900 border-l border-white/8 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div>
                <h2 className="font-semibold text-white">My Carousels</h2>
                <p className="text-xs text-white/40 mt-0.5">{library.length} saved</p>
              </div>
              <button onClick={() => setShowLibrary(false)} className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {libraryLoading && (
                <div className="flex items-center justify-center py-16 text-white/30 text-sm">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mr-2" />Loading…
                </div>
              )}
              {!libraryLoading && library.length === 0 && (
                <p className="text-center text-white/30 text-sm py-16">No carousels yet.</p>
              )}
              {!libraryLoading && library.map((item) => {
                const isPublishing = publishingIds.has(item.id)
                const isDeleting   = deletingIds.has(item.id)
                const hasPdf       = !!item.pdf_storage_path
                const isLoaded     = id === item.id
                const firstSlide   = item.slides?.[0]

                return (
                  <div key={item.id} className={`border rounded-xl p-3.5 transition-all ${isLoaded ? 'border-white/25 bg-white/5' : 'border-white/8 hover:border-white/15'}`}>
                    <p className="font-medium text-sm text-white truncate mb-1">{item.title || 'Untitled'}</p>
                    <div className="flex gap-1.5 mb-3 flex-wrap">
                      <span className="text-xs text-white/40">{item.slide_count ?? item.slides?.length ?? '?'} slides</span>
                      {hasPdf && <span className="text-xs bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded">PDF ✓</span>}
                      {item.ai_generated && <span className="text-xs bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded">AI</span>}
                      {isLoaded && <span className="text-xs bg-white/10 text-white px-1.5 py-0.5 rounded font-medium">Loaded</span>}
                    </div>
                    {firstSlide && (
                      <div className="rounded-lg overflow-hidden mb-3 ring-1 ring-white/8" style={{ maxHeight: 100 }}>
                        <SlidePreviewCSS slide={firstSlide} pattern={selectedPattern} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => loadIntoEditor(item)} className="flex-1 text-xs border border-white/15 hover:border-white/30 text-white/70 hover:text-white rounded-lg py-1.5 transition-colors">{isLoaded ? 'Reload' : 'Load'}</button>
                      <button onClick={() => publishFromLibrary(item)} disabled={isPublishing || !hasPdf} title={!hasPdf ? 'Render first to get a PDF' : 'Publish to LinkedIn'}
                        className="flex-1 text-xs bg-[#0A66C2] hover:bg-[#0958a8] disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg py-1.5 transition-colors flex items-center justify-center gap-1">
                        {isPublishing ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"/>Posting…</> : 'Publish'}
                      </button>
                      <button onClick={() => deleteFromLibrary(item)} disabled={isDeleting}
                        className="text-xs border border-red-500/20 text-red-400/70 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30 rounded-lg px-2.5 py-1.5 transition-colors">
                        {isDeleting
                          ? <span className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin block"/>
                          : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useShallow } from 'zustand/react/shallow'
import useAppStore from '../store/useAppStore'
import type { SlideData, CarouselTheme } from '../store/useAppStore'

type SlideType = SlideData['type']

const SLIDE_TYPES: SlideType[] = ['cover', 'content', 'stat', 'quote', 'cta', 'image']

function SlidePreview({ slide, theme }: { slide: SlideData; theme: CarouselTheme }) {
  const bg = theme.backgroundColor || '#FFFFFF'
  const primary = theme.primaryColor || '#0A66C2'
  const text = theme.textColor || '#1A1A1A'

  const baseStyle: React.CSSProperties = { backgroundColor: bg, color: text, fontFamily: theme.font || 'Helvetica', position: 'relative', overflow: 'hidden', width: '100%', aspectRatio: '1/1' }

  return (
    <div style={baseStyle} className="rounded-lg select-none">
      {slide.type === 'cover' && (
        <>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '10%', backgroundColor: primary }} />
          {theme.brandName && <p style={{ position: 'absolute', bottom: '2%', left: '7%', color: '#fff', fontSize: '2%', fontWeight: 700 }}>{theme.brandName}</p>}
          <div style={{ padding: '7%' }}>
            <p style={{ fontSize: '6%', fontWeight: 800, lineHeight: 1.2, color: text, maxWidth: '90%' }}>{slide.headline}</p>
            {slide.subtext && <p style={{ fontSize: '3%', color: primary, marginTop: '3%' }}>{slide.subtext}</p>}
          </div>
        </>
      )}
      {slide.type === 'content' && (
        <>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '2%', backgroundColor: primary }} />
          <div style={{ padding: '7% 7% 7% 9%' }}>
            <p style={{ fontSize: '4.5%', fontWeight: 700, lineHeight: 1.3, color: text }}>{slide.headline}</p>
            {slide.body && <p style={{ fontSize: '2.8%', marginTop: '4%', color: text, lineHeight: 1.6 }}>{slide.body}</p>}
            {slide.bulletPoints?.map((bp, i) => (
              <p key={i} style={{ fontSize: '2.5%', marginTop: '2%', color: text }}>• {bp}</p>
            ))}
          </div>
        </>
      )}
      {slide.type === 'stat' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '7%' }}>
          <p style={{ fontSize: '14%', fontWeight: 900, color: primary, lineHeight: 1 }}>{slide.statNumber}</p>
          <p style={{ fontSize: '3.5%', fontWeight: 700, color: text, textAlign: 'center', marginTop: '3%' }}>{slide.statLabel}</p>
          {slide.body && <p style={{ fontSize: '2.5%', color: text, textAlign: 'center', marginTop: '2%' }}>{slide.body}</p>}
        </div>
      )}
      {slide.type === 'quote' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '10%' }}>
          <p style={{ fontSize: '15%', color: primary, opacity: 0.2, lineHeight: 0.5, alignSelf: 'flex-start' }}>"</p>
          <p style={{ fontSize: '4%', fontWeight: 700, color: text, textAlign: 'center', lineHeight: 1.5, marginTop: '-5%' }}>{slide.quote}</p>
          {slide.attribution && <p style={{ fontSize: '2.5%', color: primary, marginTop: '4%' }}>— {slide.attribution}</p>}
        </div>
      )}
      {slide.type === 'cta' && (
        <div style={{ backgroundColor: primary, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '10%' }}>
          <p style={{ fontSize: '5.5%', fontWeight: 800, color: '#fff', textAlign: 'center', lineHeight: 1.3 }}>{slide.headline}</p>
          {slide.body && <p style={{ fontSize: '3%', color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: '4%', lineHeight: 1.5 }}>{slide.body}</p>}
          {theme.brandName && <p style={{ fontSize: '2.5%', color: '#fff', fontWeight: 700, marginTop: 'auto', paddingTop: '6%' }}>{theme.brandName}</p>}
        </div>
      )}
      {slide.type === 'image' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#f3f4f6' }}>
          <p style={{ fontSize: '3%', color: '#9ca3af' }}>Image slide</p>
        </div>
      )}
    </div>
  )
}

function SlideEditor({ slide, index }: { slide: SlideData; index: number }) {
  const updateSlide = useAppStore((s) => s.updateSlide)
  const set = (patch: Partial<SlideData>) => updateSlide(index, patch)

  return (
    <div className="space-y-3 text-sm">
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</label>
        <select value={slide.type} onChange={(e) => set({ type: e.target.value as SlideType })}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
          {SLIDE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      {['cover', 'content', 'cta'].includes(slide.type) && (
        <div>
          <label className="text-xs font-medium text-gray-500">Headline</label>
          <input value={slide.headline || ''} onChange={(e) => set({ headline: e.target.value })}
            maxLength={80} placeholder="Headline…"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        </div>
      )}

      {slide.type === 'cover' && (
        <div>
          <label className="text-xs font-medium text-gray-500">Subtext</label>
          <input value={slide.subtext || ''} onChange={(e) => set({ subtext: e.target.value })} placeholder="Subtext…"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        </div>
      )}

      {['content', 'cta', 'stat'].includes(slide.type) && (
        <div>
          <label className="text-xs font-medium text-gray-500">Body</label>
          <textarea value={slide.body || ''} onChange={(e) => set({ body: e.target.value })} rows={3} placeholder="Body text…"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none" />
        </div>
      )}

      {slide.type === 'content' && (
        <div>
          <label className="text-xs font-medium text-gray-500">Bullet Points</label>
          {(slide.bulletPoints || []).map((bp, i) => (
            <div key={i} className="flex gap-1 mt-1">
              <input value={bp} onChange={(e) => {
                const bps = [...(slide.bulletPoints || [])]
                bps[i] = e.target.value
                set({ bulletPoints: bps })
              }} className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none" />
              <button onClick={() => set({ bulletPoints: (slide.bulletPoints || []).filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-400 px-1">×</button>
            </div>
          ))}
          <button onClick={() => set({ bulletPoints: [...(slide.bulletPoints || []), ''] })}
            className="mt-1 text-xs text-indigo-600 hover:underline">+ Add bullet</button>
        </div>
      )}

      {slide.type === 'stat' && (
        <>
          <div>
            <label className="text-xs font-medium text-gray-500">Stat Number</label>
            <input value={slide.statNumber || ''} onChange={(e) => set({ statNumber: e.target.value })} placeholder="e.g. 83%"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Stat Label</label>
            <input value={slide.statLabel || ''} onChange={(e) => set({ statLabel: e.target.value })} placeholder="Context line…"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          </div>
        </>
      )}

      {slide.type === 'quote' && (
        <>
          <div>
            <label className="text-xs font-medium text-gray-500">Quote</label>
            <textarea value={slide.quote || ''} onChange={(e) => set({ quote: e.target.value })} rows={3} placeholder="Quote text…"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Attribution (optional)</label>
            <input value={slide.attribution || ''} onChange={(e) => set({ attribution: e.target.value })} placeholder="— Name"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          </div>
        </>
      )}
    </div>
  )
}

export default function CarouselBuilder() {
  const { carouselEditor, setCarouselEditor, setActiveSlide, addSlide, removeSlide, setSlides, updateCarouselTheme, selectedModel } =
    useAppStore(useShallow((s) => ({
      carouselEditor:      s.carouselEditor,
      setCarouselEditor:   s.setCarouselEditor,
      setActiveSlide:      s.setActiveSlide,
      addSlide:            s.addSlide,
      removeSlide:         s.removeSlide,
      setSlides:           s.setSlides,
      updateCarouselTheme: s.updateCarouselTheme,
      selectedModel:       s.selectedModel,
    })))

  const { slides, theme, activeSlideIndex, title, id } = carouselEditor
  const activeSlide = slides[activeSlideIndex]

  const [generating, setGenerating]   = useState(false)
  const [pdfLoading, setPdfLoading]   = useState(false)
  const [pdfUrl, setPdfUrl]           = useState<string | null>(null)
  const [publishing, setPublishing]   = useState(false)
  const [genTopic, setGenTopic]       = useState('')
  const [showGenModal, setShowGenModal] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates]     = useState<{ id: string; name: string; slide_structure: { order: number; type: SlideType }[] }[]>([])
  const [caption, setCaption]         = useState('')

  useEffect(() => {
    api.get('/api/carousel/templates').then((r) => setTemplates(r.data)).catch(() => {})
  }, [])

  const generateSlides = async () => {
    if (!genTopic.trim()) { toast.error('Enter a topic'); return }
    setGenerating(true)
    try {
      const { data } = await api.post<{ slides: SlideData[] }>('/api/carousel/generate', { topic: genTopic, slideCount: 7, model: selectedModel })
      setSlides(data.slides)
      setCarouselEditor({ title: genTopic, isDirty: true })
      setShowGenModal(false)
      toast.success(`${data.slides.length} slides generated`)
    } catch { toast.error('Generation failed') }
    finally { setGenerating(false) }
  }

  const saveCarousel = async () => {
    try {
      if (id) {
        await api.put(`/api/carousel/${id}`, { title, slides, theme })
        toast.success('Saved')
      } else {
        const { data } = await api.post('/api/carousel', { title: title || 'Untitled', slides, theme, aiGenerated: true })
        setCarouselEditor({ id: data.id })
        toast.success('Carousel saved')
      }
    } catch { toast.error('Save failed') }
  }

  const generatePDF = async () => {
    if (!id) { await saveCarousel(); return }
    setPdfLoading(true)
    try {
      const { data } = await api.post<{ pdfUrl: string }>(`/api/carousel/${id}/pdf`)
      setPdfUrl(data.pdfUrl)
      toast.success('PDF generated')
    } catch { toast.error('PDF generation failed') }
    finally { setPdfLoading(false) }
  }

  const publish = async () => {
    if (!id) { toast.error('Save the carousel first'); return }
    if (!pdfUrl) { await generatePDF(); return }
    setPublishing(true)
    try {
      await api.post(`/api/carousel/${id}/publish`, { caption })
      toast.success('Posted to LinkedIn!')
    } catch { toast.error('Publish failed — check LinkedIn is connected') }
    finally { setPublishing(false) }
  }

  const loadTemplate = (tmpl: typeof templates[0]) => {
    const newSlides: SlideData[] = tmpl.slide_structure.map((s) => ({ order: s.order, type: s.type, headline: '' }))
    setSlides(newSlides)
    setShowTemplates(false)
    toast.success(`Template loaded: ${tmpl.name}`)
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200">
        <input
          value={carouselEditor.title}
          onChange={(e) => setCarouselEditor({ title: e.target.value })}
          placeholder="Carousel title…"
          className="text-lg font-semibold text-gray-900 focus:outline-none border-b border-transparent focus:border-indigo-400 min-w-[200px]"
        />
        <div className="flex items-center gap-2">
          <button onClick={saveCarousel} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 text-gray-600">Save</button>
          <button onClick={generatePDF} disabled={pdfLoading || !slides.length} className="text-sm btn-gradient-indigo-outline border border-indigo-200 text-indigo-700 rounded-lg px-3 py-1.5">
            {pdfLoading ? 'Generating…' : 'Generate PDF'}
          </button>
          {pdfUrl && <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-green-600 hover:underline">View PDF ↗</a>}
          <button onClick={publish} disabled={publishing} className="btn-gradient-blue text-white px-4 py-1.5 rounded-lg text-sm font-medium">
            {publishing ? 'Posting…' : 'Post to LinkedIn'}
          </button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Slide list */}
        <div className="w-52 shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="flex gap-1 p-2 border-b border-gray-100">
            <button onClick={() => setShowGenModal(true)} className="flex-1 text-xs btn-gradient text-white rounded-lg py-1.5">AI Generate</button>
            <button onClick={() => setShowTemplates(true)} className="flex-1 text-xs border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 text-gray-600">Templates</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {slides.map((slide, i) => (
              <button key={i} onClick={() => setActiveSlide(i)}
                className={`w-full text-left p-2 rounded-lg border transition-all ${activeSlideIndex === i ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase">{slide.type}</span>
                  <button onClick={(e) => { e.stopPropagation(); removeSlide(i) }} className="text-gray-300 hover:text-red-400 text-sm">×</button>
                </div>
                <p className="text-xs text-gray-700 mt-0.5 truncate">{slide.headline || slide.quote || slide.statNumber || '—'}</p>
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-gray-100">
            <select onChange={(e) => { addSlide({ order: slides.length + 1, type: e.target.value as SlideType, headline: '' }); e.target.value = '' }}
              defaultValue=""
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none">
              <option value="" disabled>+ Add slide type…</option>
              {SLIDE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Center — Canvas */}
        <div className="flex-1 flex items-center justify-center bg-gray-100 p-6">
          {activeSlide ? (
            <div className="w-full max-w-md shadow-2xl rounded-xl overflow-hidden">
              <SlidePreview slide={activeSlide} theme={theme} />
              <div className="text-center text-xs text-gray-400 mt-2">
                Slide {activeSlideIndex + 1} of {slides.length}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400">
              <p className="text-lg mb-2">No slides yet</p>
              <button onClick={() => setShowGenModal(true)} className="btn-gradient text-white px-4 py-2 rounded-lg text-sm">AI Generate</button>
            </div>
          )}
        </div>

        {/* Right — Slide editor + Brand theme */}
        <div className="w-72 shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-4 space-y-6">
          {activeSlide && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Slide Content</h3>
              <SlideEditor slide={activeSlide} index={activeSlideIndex} />
            </div>
          )}

          {/* Brand theme */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Brand Theme</h3>
            <div className="space-y-3">
              {([
                { label: 'Primary', key: 'primaryColor' },
                { label: 'Background', key: 'backgroundColor' },
                { label: 'Text', key: 'textColor' },
              ] as { label: string; key: keyof CarouselTheme }[]).map(({ label, key }) => (
                <div key={key} className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 w-24">{label}</label>
                  <input type="color" value={theme[key] as string || '#000000'}
                    onChange={(e) => updateCarouselTheme({ [key]: e.target.value } as Partial<CarouselTheme>)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                  <span className="text-xs text-gray-400 font-mono">{theme[key] as string}</span>
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500">Font</label>
                <select value={theme.font || 'Helvetica'} onChange={(e) => updateCarouselTheme({ font: e.target.value })}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none">
                  {['Helvetica', 'Georgia', 'Courier New', 'Arial'].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Brand Name</label>
                <input value={theme.brandName || ''} onChange={(e) => updateCarouselTheme({ brandName: e.target.value })}
                  placeholder="Your name or handle"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </div>
            </div>
          </div>

          {/* LinkedIn caption */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">LinkedIn Caption</h3>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} placeholder="Post caption for LinkedIn…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none" />
          </div>
        </div>
      </div>

      {/* AI Generate modal */}
      {showGenModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-96 space-y-4">
            <h2 className="font-semibold text-gray-900">AI Generate Carousel</h2>
            <input value={genTopic} onChange={(e) => setGenTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') generateSlides() }}
              placeholder="Topic or key insight…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus />
            <div className="flex gap-2">
              <button onClick={generateSlides} disabled={generating}
                className="flex-1 btn-gradient text-white px-4 py-2 rounded-lg text-sm font-medium">
                {generating ? 'Generating…' : 'Generate'}
              </button>
              <button onClick={() => setShowGenModal(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Templates modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[500px] space-y-4">
            <h2 className="font-semibold text-gray-900">Load Template</h2>
            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
              {templates.map((tmpl) => (
                <button key={tmpl.id} onClick={() => loadTemplate(tmpl)}
                  className="border border-gray-200 rounded-xl p-4 text-left hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                  <p className="font-medium text-sm text-gray-800">{tmpl.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{tmpl.slide_structure.length} slides</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {tmpl.slide_structure.map((s, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{s.type}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowTemplates(false)} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

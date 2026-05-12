import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { formatDate } from '../lib/utils'

type MediaType = 'image' | 'video' | 'gif'
interface Asset { id: string; type: MediaType; filename: string; storagePath: string; mimeType: string; sizeBytes: number; altText: string | null; createdAt: string }

const FILTERS = [
  { label: 'All',    value: '' },
  { label: 'Images', value: 'image' },
  { label: 'Videos', value: 'video' },
  { label: 'GIFs',   value: 'gif' },
]

function formatBytes(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function MediaLibrary() {
  const [assets, setAssets]   = useState<Asset[]>([])
  const [filter, setFilter]   = useState('')
  const [selected, setSelected] = useState<Asset | null>(null)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/media/library?page=${page}&limit=24`)
      .then((r) => setAssets((prev) => page === 1 ? r.data : [...prev, ...r.data]))
      .catch(() => toast.error('Failed to load media'))
      .finally(() => setLoading(false))
  }, [page])

  const filtered = filter ? assets.filter((a) => a.type === filter) : assets

  const deleteAsset = async (id: string) => {
    if (!confirm('Delete this file permanently?')) return
    try {
      await api.delete(`/api/media/${id}`)
      setAssets((prev) => prev.filter((a) => a.id !== id))
      setSelected(null)
      toast.success('Deleted')
    } catch { toast.error('Delete failed') }
  }

  const totalSize = assets.reduce((s, a) => s + (a.sizeBytes || 0), 0)

  return (
    <div className="p-5 h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-xs text-gray-400 mt-0.5">Storage used: {formatBytes(totalSize)} · {assets.length} files</p>
        </div>
        <div className="flex gap-1">
          {FILTERS.map(({ label, value }) => (
            <button key={value} onClick={() => setFilter(value)}
              className={`text-sm px-3 py-1.5 rounded-lg ${filter === value ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading && page === 1 ? (
            <p className="text-center text-gray-400 mt-8">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 mt-8 text-sm">No media files yet. Upload from the Composer.</p>
          ) : (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {filtered.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => setSelected(asset)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${selected?.id === asset.id ? 'border-indigo-400' : 'border-transparent hover:border-gray-200'}`}
                  >
                    {asset.type === 'video' ? (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-2xl text-white">▶</div>
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">{asset.filename.slice(0, 10)}</div>
                    )}
                  </button>
                ))}
              </div>
              {assets.length >= page * 24 && (
                <button onClick={() => setPage((p) => p + 1)} className="mt-4 w-full text-sm text-gray-500 border border-gray-200 rounded-lg py-2 hover:bg-gray-50">
                  Load more
                </button>
              )}
            </>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-64 bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-400 tracking-wide">{selected.type}</span>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm overflow-hidden">
              {selected.type === 'video' ? '▶ Video' : selected.filename}
            </div>
            <div className="space-y-1 text-xs text-gray-500">
              <p className="truncate" title={selected.filename}>{selected.filename}</p>
              <p>{formatBytes(selected.sizeBytes)}</p>
              <p>{formatDate(selected.createdAt)}</p>
              {selected.altText && <p className="italic text-gray-400">"{selected.altText}"</p>}
            </div>
            <button onClick={() => deleteAsset(selected.id)} className="mt-auto text-sm text-red-500 border border-red-200 rounded-lg py-1.5 hover:bg-red-50">
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

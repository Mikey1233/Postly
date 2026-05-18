import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { formatDate } from '../lib/utils'
import { useConfirm } from '../components/ui/ConfirmDialog'

type MediaType = 'image' | 'video' | 'gif'
interface Asset {
  id: string
  type: MediaType
  filename: string
  storagePath: string
  mimeType: string
  sizeBytes: number
  altText: string | null
  createdAt: string
  url: string | null
  thumbnailUrl: string | null
}

interface AssetRow {
  id: string
  type: MediaType
  filename: string
  storage_path: string
  mime_type: string
  size_bytes: number
  alt_text: string | null
  created_at: string
  signed_url: string | null
  thumbnail_url: string | null
}

function rowToAsset(r: AssetRow): Asset {
  return {
    id:           r.id,
    type:         r.type,
    filename:     r.filename,
    storagePath:  r.storage_path,
    mimeType:     r.mime_type,
    sizeBytes:    r.size_bytes,
    altText:      r.alt_text,
    createdAt:    r.created_at,
    url:          r.signed_url,
    thumbnailUrl: r.thumbnail_url,
  }
}

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
  const confirm = useConfirm()
  const [assets, setAssets]   = useState<Asset[]>([])
  const [filter, setFilter]   = useState('')
  const [selected, setSelected] = useState<Asset | null>(null)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<AssetRow[]>(`/api/media/library?page=${page}&limit=24`)
      .then((r) => {
        const mapped = r.data.map(rowToAsset)
        setAssets((prev) => page === 1 ? mapped : [...prev, ...mapped])
      })
      .catch(() => toast.error('Failed to load media'))
      .finally(() => setLoading(false))
  }, [page])

  const filtered = filter ? assets.filter((a) => a.type === filter) : assets

  const deleteAsset = async (id: string) => {
    if (!(await confirm({ title: 'Delete file?', body: 'This permanently removes the file from storage.', destructive: true }))) return
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
                {filtered.map((asset) => {
                  const thumbSrc = asset.thumbnailUrl || (asset.type !== 'video' ? asset.url : null)
                  return (
                    <button
                      key={asset.id}
                      onClick={() => setSelected(asset)}
                      title={asset.filename}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all bg-gray-100 ${selected?.id === asset.id ? 'border-indigo-400' : 'border-transparent hover:border-gray-200'}`}
                    >
                      {thumbSrc ? (
                        <img
                          src={thumbSrc}
                          alt={asset.altText || asset.filename}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                          {asset.filename.slice(0, 10)}
                        </div>
                      )}
                      {asset.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-2xl text-white">▶</div>
                      )}
                    </button>
                  )
                })}
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
              {selected.type === 'video' ? (
                selected.url ? (
                  <video src={selected.url} poster={selected.thumbnailUrl || undefined} controls className="w-full h-full object-contain bg-black" />
                ) : (
                  <span>▶ Video</span>
                )
              ) : selected.url ? (
                <img src={selected.url} alt={selected.altText || selected.filename} className="w-full h-full object-contain" />
              ) : (
                <span className="px-2 text-center wrap-break-word">{selected.filename}</span>
              )}
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

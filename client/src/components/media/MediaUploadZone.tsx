import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { validateMediaForPlatforms } from '../../lib/platformLimits'
import type { Platform } from '../../lib/platformLimits'
import type { MediaAsset } from '../../store/useAppStore'

interface RawMediaAsset {
  id: string; type: 'image' | 'video' | 'gif'; filename: string
  storage_path: string; thumbnail_path: string | null
  mime_type: string; size_bytes: number; alt_text: string | null; sort_order: number
}

interface Props {
  platforms: Platform[]
  assets: MediaAsset[]
  postId?: string | null
  onAdd: (asset: MediaAsset) => void
  onRemove: (id: string) => void
  showAltText?: boolean
  maxFiles?: number
}

export default function MediaUploadZone({ platforms, assets, postId, onAdd, onRemove, showAltText = true, maxFiles = 10 }: Props) {
  const [uploading, setUploading] = useState<string[]>([])

  const onDrop = useCallback(async (accepted: File[]) => {
    const warnings = validateMediaForPlatforms(
      accepted.map((f) => ({ size: f.size, type: f.type })),
      platforms,
    )
    if (warnings.length) warnings.forEach((w) => toast.error(w))

    for (const file of accepted.slice(0, maxFiles - assets.length)) {
      const localId = `uploading-${Date.now()}-${file.name}`
      setUploading((prev) => [...prev, localId])
      try {
        const fd = new FormData()
        fd.append('file', file)
        if (postId) fd.append('post_id', postId)
        fd.append('sort_order', String(assets.length))
        fd.append('platforms', JSON.stringify(platforms))

        const { data } = await api.post<RawMediaAsset>('/api/media/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        onAdd({
          id:            data.id,
          type:          data.type,
          filename:      data.filename,
          storagePath:   data.storage_path,
          thumbnailPath: data.thumbnail_path,
          mimeType:      data.mime_type,
          sizeBytes:     data.size_bytes,
          altText:       data.alt_text,
          sortOrder:     data.sort_order,
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        toast.error(`Failed to upload ${file.name}: ${msg}`)
      } finally {
        setUploading((prev) => prev.filter((id) => id !== localId))
      }
    }
  }, [platforms, assets.length, postId, maxFiles, onAdd])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [], 'image/gif': [] },
    maxFiles,
  })

  const saveAltText = async (asset: MediaAsset, altText: string) => {
    try {
      await api.post(`/api/media/${asset.id}/alt-text`, { altText })
    } catch { /* silent fail for alt text */ }
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-gray-500">
          {isDragActive ? 'Drop files here…' : 'Drop images or videos, or click to browse'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{assets.length}/{maxFiles} files</p>
      </div>

      {/* Uploading indicators */}
      {uploading.map((id) => (
        <div key={id} className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Uploading…
        </div>
      ))}

      {/* Asset grid */}
      {assets.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {assets.map((asset) => (
            <div key={asset.id} className="relative group">
              {asset.type === 'video' ? (
                <div className="aspect-square bg-gray-900 rounded-lg flex items-center justify-center">
                  <span className="text-white text-2xl">▶</span>
                </div>
              ) : (
                <img
                  src={`/api/media/${asset.id}/thumb`}
                  alt={asset.altText || asset.filename}
                  className="aspect-square object-cover rounded-lg bg-gray-100 w-full"
                  onError={(e) => { (e.target as HTMLImageElement).src = '' }}
                />
              )}
              <button
                onClick={() => onRemove(asset.id)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                ×
              </button>
              {showAltText && (
                <input
                  defaultValue={asset.altText || ''}
                  onBlur={(e) => saveAltText(asset, e.target.value)}
                  placeholder="Alt text…"
                  className="mt-1 w-full text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Validation warnings */}
      {platforms.length > 0 && assets.length > 0 && (() => {
        const warns = validateMediaForPlatforms(
          assets.map((a) => ({ size: a.sizeBytes, type: a.mimeType })),
          platforms,
        )
        return warns.map((w) => (
          <p key={w} className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">⚠ {w}</p>
        ))
      })()}
    </div>
  )
}

'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface PhotoUploadProps {
  userId: string
  date: string
  currentUrl: string | null
  onUploaded: (url: string) => void
}

export default function PhotoUpload({ userId, date, currentUrl, onUploaded }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10 MB.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${date}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('progress-photos').getPublicUrl(path)
      // Add cache-bust so the browser re-fetches after re-upload
      const url = `${data.publicUrl}?t=${Date.now()}`
      onUploaded(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider">Progress Photo</p>

      {currentUrl ? (
        <div className="relative w-full aspect-square max-w-[200px] rounded-xl overflow-hidden border border-border">
          <Image src={currentUrl} alt="Progress photo" fill className="object-cover" unoptimized />
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity text-white text-xs font-semibold"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full py-8 rounded-xl border border-dashed border-border bg-surface flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-surface-2 transition-all disabled:opacity-50"
        >
          <span className="text-3xl">📸</span>
          <span className="text-sm text-muted">
            {uploading ? 'Uploading…' : 'Tap to upload photo'}
          </span>
        </button>
      )}

      {uploading && (
        <p className="text-xs text-muted animate-pulse">Uploading photo…</p>
      )}
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          // Reset so same file can be re-selected
          e.target.value = ''
        }}
      />
    </div>
  )
}

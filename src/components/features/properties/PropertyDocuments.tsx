'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Film, Download, Trash2, Paperclip } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { FileUpload } from '@/components/common/ui/FileUpload'
import { toast } from 'sonner'
import type { PropertyDocument } from '@/types/database'

const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
]

const MAX_FILES = 10

interface PropertyDocumentsProps {
  propertyId: string
  canEdit: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileTypeLabel(mimeType: string | null): string {
  if (!mimeType) return 'Ficheiro'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.includes('word')) return 'Word'
  if (mimeType === 'video/mp4') return 'MP4'
  if (mimeType === 'video/quicktime') return 'MOV'
  return 'Ficheiro'
}

function isVideo(mimeType: string | null): boolean {
  return mimeType === 'video/mp4' || mimeType === 'video/quicktime'
}

export function PropertyDocuments({ propertyId, canEdit }: PropertyDocumentsProps) {
  const [documents, setDocuments] = useState<PropertyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/documents`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDocuments(data.documents ?? [])
    } catch {
      toast.error('Erro ao carregar documentos')
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  async function uploadFiles(files: File[]) {
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/properties/${propertyId}/documents`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? `Erro ao enviar ${file.name}`)
      } else {
        toast.success(`${file.name} enviado`)
      }
    }
    await fetchDocuments()
  }

  async function handleDelete(docId: string, fileName: string) {
    if (!confirm(`Remover "${fileName}"?`)) return
    setDeletingId(docId)
    try {
      const res = await fetch(`/api/properties/${propertyId}/documents/${docId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      toast.success('Documento removido')
      setDocuments(prev => prev.filter(d => d.id !== docId))
    } catch {
      toast.error('Erro ao remover documento')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDownload(doc: PropertyDocument) {
    const res = await fetch(`/api/properties/${propertyId}/documents/${doc.id}`)
    if (!res.ok) { toast.error('Erro ao obter link de download'); return }
    const { url } = await res.json()
    window.open(url, '_blank')
  }

  const docCount = documents.length

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Paperclip className="h-5 w-5" />
        Documentos{docCount > 0 ? ` (${docCount})` : ''}
      </h3>

      {loading ? (
        <p className="text-sm text-gray-600">A carregar…</p>
      ) : (
        <div className="space-y-5">
          {/* File list */}
          {documents.length > 0 && (
            <ul className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
              {documents.map(doc => (
                <li key={doc.id} className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    {isVideo(doc.mime_type)
                      ? <Film className="h-5 w-5 text-purple-400 flex-shrink-0" />
                      : <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                      <p className="text-xs text-gray-600">
                        {fileTypeLabel(doc.mime_type)}
                        {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                        {' · '}{new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      title="Download"
                      className="text-brand-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id, doc.file_name)}
                        disabled={deletingId === doc.id}
                        title="Remover"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Upload zones */}
          {canEdit && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Documentos (PDF, Word)</p>
                <FileUpload
                  onUpload={uploadFiles}
                  currentCount={docCount}
                  maxFiles={MAX_FILES}
                  allowedTypes={ALLOWED_DOC_TYPES}
                  maxFileSize={20 * 1024 * 1024}
                  acceptAttr=".pdf,.doc,.docx"
                  hint="PDF, Word · Máx. 20MB"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Vídeos (MP4, MOV)</p>
                <FileUpload
                  onUpload={uploadFiles}
                  currentCount={docCount}
                  maxFiles={MAX_FILES}
                  allowedTypes={ALLOWED_VIDEO_TYPES}
                  maxFileSize={100 * 1024 * 1024}
                  acceptAttr=".mp4,.mov"
                  hint="MP4, MOV · Máx. 100MB"
                />
              </div>
            </div>
          )}

          {documents.length === 0 && !canEdit && (
            <p className="text-sm text-gray-600">Sem documentos anexados.</p>
          )}
        </div>
      )}
    </div>
  )
}

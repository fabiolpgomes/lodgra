'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Download, Trash2, Paperclip } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { FileUpload } from '@/components/common/ui/FileUpload'
import { toast } from 'sonner'
import type { ExpenseDocument } from '@/types/database'

interface ExpenseDocumentsProps {
  expenseId: string
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
  if (mimeType.startsWith('image/')) return 'Imagem'
  if (mimeType.includes('word')) return 'Word'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Excel'
  return 'Ficheiro'
}

export function ExpenseDocuments({ expenseId, canEdit }: ExpenseDocumentsProps) {
  const [documents, setDocuments] = useState<ExpenseDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/expenses/${expenseId}/documents`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDocuments(data.documents ?? [])
    } catch {
      toast.error('Erro ao carregar documentos')
    } finally {
      setLoading(false)
    }
  }, [expenseId])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  async function handleUpload(files: File[]) {
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/expenses/${expenseId}/documents`, {
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
      const res = await fetch(`/api/expenses/${expenseId}/documents/${docId}`, {
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

  async function handleDownload(doc: ExpenseDocument) {
    const res = await fetch(`/api/expenses/${expenseId}/documents/${doc.id}`)
    if (!res.ok) { toast.error('Erro ao obter link de download'); return }
    const { url } = await res.json()
    window.open(url, '_blank')
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Paperclip className="h-5 w-5" />
        Documentos{documents.length > 0 ? ` (${documents.length})` : ''}
      </h3>

      {loading ? (
        <p className="text-sm text-gray-600">A carregar…</p>
      ) : (
        <div className="space-y-4">
          {documents.length > 0 && (
            <ul className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
              {documents.map(doc => (
                <li key={doc.id} className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                      <p className="text-xs text-gray-600">
                        {fileTypeLabel(doc.mime_type)}
                        {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
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

          {canEdit && (
            <FileUpload onUpload={handleUpload} currentCount={documents.length} />
          )}

          {documents.length === 0 && !canEdit && (
            <p className="text-sm text-gray-600">Sem documentos anexados.</p>
          )}
        </div>
      )}
    </div>
  )
}

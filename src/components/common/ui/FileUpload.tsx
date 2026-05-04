'use client'

import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const MAX_FILES = 5

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>
  currentCount: number
  disabled?: boolean
}

export function FileUpload({ onUpload, currentCount, disabled }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const remaining = MAX_FILES - currentCount

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setErrors([])

    const valid: File[] = []
    const errs: string[] = []

    for (const file of Array.from(fileList)) {
      if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
        errs.push(`${file.name}: tipo não permitido`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        errs.push(`${file.name}: excede 20MB`)
        continue
      }
      valid.push(file)
    }

    const canAdd = MAX_FILES - currentCount
    if (valid.length > canAdd) {
      errs.push(`Apenas ${canAdd} ficheiro${canAdd !== 1 ? 's' : ''} adicionado${canAdd !== 1 ? 's' : ''} (limite de ${MAX_FILES})`)
      valid.splice(canAdd)
    }

    if (errs.length) setErrors(errs)
    if (!valid.length) return

    setUploading(true)
    try {
      await onUpload(valid)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => !disabled && remaining > 0 && !uploading && inputRef.current?.click()}
        className={[
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
          disabled || remaining <= 0 || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        {uploading ? (
          <p className="text-sm text-blue-600 font-medium">A fazer upload…</p>
        ) : remaining > 0 ? (
          <>
            <p className="text-sm text-gray-600">
              Arraste ficheiros ou{' '}
              <span className="text-blue-600 font-medium">clique para seleccionar</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, JPEG, Word, Excel · Máx. 20MB · {remaining} espaço{remaining !== 1 ? 's' : ''} disponível{remaining !== 1 ? 'is' : ''}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500">Limite de {MAX_FILES} ficheiros atingido</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled || remaining <= 0 || uploading}
      />

      {errors.map((err, i) => (
        <p key={i} className="text-sm text-red-600">{err}</p>
      ))}
    </div>
  )
}

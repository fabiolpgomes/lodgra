/** Tipos, tamanho e quantidade aceitos para documentos anexados (despesas, propriedades). */
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024 // 20MB
export const MAX_DOCUMENTS_PER_ITEM = 5

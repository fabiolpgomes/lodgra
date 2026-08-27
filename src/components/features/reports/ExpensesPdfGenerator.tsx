'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { FileText, Download, Share2, X, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface Property {
  id: string
  name: string
}

interface ShareModalState {
  isOpen: boolean
  fileName: string
  whatsappText: string
  copied: boolean
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'Todas as categorias' },
  { value: 'water', label: 'Água' },
  { value: 'electricity', label: 'Eletricidade' },
  { value: 'gas', label: 'Gás' },
  { value: 'phone', label: 'Telefone' },
  { value: 'internet', label: 'Internet' },
  { value: 'condo', label: 'Condomínio' },
  { value: 'cleaning', label: 'Limpeza' },
  { value: 'laundry', label: 'Lavandaria' },
  { value: 'cleaning_supplies', label: 'Material de limpeza' },
  { value: 'repairs', label: 'Reparos' },
  { value: 'insurance', label: 'Seguro Residencial' },
  { value: 'management', label: 'Gestão do imóvel' },
  { value: 'other', label: 'Outros' },
]

interface ExpensesPdfGeneratorProps {
  properties: Property[]
}

export function ExpensesPdfGenerator({ properties }: ExpensesPdfGeneratorProps) {
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [shareModal, setShareModal] = useState<ShareModalState>({
    isOpen: false,
    fileName: '',
    whatsappText: '',
    copied: false,
  })
  const pdfParamsRef = useRef<{ startDate: string; endDate: string; propertyId: string; category: string }>({
    startDate: '',
    endDate: '',
    propertyId: '',
    category: '',
  })

  async function handleGeneratePdf() {
    if (!startDate || !endDate) {
      toast.error('Por favor, selecione um período')
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('A data inicial não pode ser depois da data final')
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        propertyId: selectedPropertyId === 'all' ? '' : selectedPropertyId,
        category: selectedCategory,
      })

      const response = await fetch(`/api/reports/expenses-pdf?${params}`)
      if (!response.ok) throw new Error('Erro ao gerar PDF')

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const data: any = await response.json()
      /* eslint-enable @typescript-eslint/no-explicit-any */

      pdfParamsRef.current = {
        startDate: data.startDate,
        endDate: data.endDate,
        propertyId: data.propertyId,
        category: data.category,
      }

      const fileName = `despesas-${startDate}-${endDate}.pdf`

      const whatsappText = `📋 Relatório de Despesas\n\nPeríodo: ${new Date(startDate).toLocaleDateString('pt-PT')} a ${new Date(endDate).toLocaleDateString('pt-PT')}\nTotal de despesas: ${data.expenses.length}\n\nDescarregue o PDF para ver todos os detalhes.`

      setShareModal({
        isOpen: true,
        fileName,
        whatsappText,
        copied: false,
      })

      toast.success('PDF gerado com sucesso!')
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao gerar PDF')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadPdf() {
    const params = pdfParamsRef.current

    if (!params.startDate || !params.endDate) {
      toast.error('PDF nao disponivel')
      return
    }

    try {
      const queryParams = new URLSearchParams({
        startDate: params.startDate,
        endDate: params.endDate,
        propertyId: params.propertyId,
        category: params.category,
      })

      window.open(`/api/reports/expenses-pdf-download?${queryParams}`, '_blank')
      toast.success('A abrir relatório em nova aba...')
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao abrir relatório')
    }
  }

  function handleCopyText() {
    navigator.clipboard.writeText(shareModal.whatsappText)
    setShareModal(prev => ({ ...prev, copied: true }))
    toast.success('Copiado para a área de transferência!')

    setTimeout(() => {
      setShareModal(prev => ({ ...prev, copied: false }))
    }, 2000)
  }

  function handleShareWhatsApp() {
    const text = `${shareModal.whatsappText}\n\n💾 Descarregue o PDF clicando no botão "Descarregar PDF"!`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  function closeShareModal() {
    setShareModal(prev => ({ ...prev, isOpen: false }))
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
          <FileText className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Gerar PDF de Despesas</h2>
          <p className="text-sm text-gray-600">Exporte um relatório de despesas em PDF</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Propriedade */}
        <div>
          <Label htmlFor="property" className="mb-2 block">
            Propriedade
          </Label>
          <select
            id="property"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="all">Todas as propriedades</option>
            {properties.map((prop) => (
              <option key={prop.id} value={prop.id}>
                {prop.name}
              </option>
            ))}
          </select>
        </div>

        {/* Categoria */}
        <div>
          <Label htmlFor="category" className="mb-2 block">
            Categoria
          </Label>
          <select
            id="category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate" className="mb-2 block">
              Data inicial
            </Label>
            <Input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label htmlFor="endDate" className="mb-2 block">
              Data final
            </Label>
            <Input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
              className="bg-gray-50"
            />
          </div>
        </div>

        {/* Info */}
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800 text-sm">
            O relatório incluirá todas as despesas registadas dentro do período selecionado.
          </AlertDescription>
        </Alert>

        {/* Buttons */}
        <div className="flex justify-center">
          <Button
            onClick={handleGeneratePdf}
            disabled={loading}
            className="w-full md:w-auto px-8 bg-red-600 hover:bg-red-700"
            size="lg"
          >
            <FileText className="mr-2 h-5 w-5" />
            {loading ? 'A gerar PDF...' : 'Gerar PDF'}
          </Button>
        </div>
      </div>

      {/* Share Modal */}
      {shareModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-6">
              <h2 className="text-xl font-semibold text-gray-900">PDF gerado!</h2>
              <button
                onClick={closeShareModal}
                className="text-gray-600 hover:text-gray-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-emerald-800 text-sm font-medium">
                  ✓ Arquivo: <span className="font-semibold">{shareModal.fileName}</span>
                </p>
              </div>

              {/* Download Button */}
              <Button
                onClick={handleDownloadPdf}
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
              >
                <Download className="mr-2 h-5 w-5" />
                Descarregar PDF
              </Button>

              {/* Share Section */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Partilhar via WhatsApp
                </p>

                <Button
                  onClick={handleCopyText}
                  variant="outline"
                  className="w-full mb-2"
                  size="sm"
                >
                  {shareModal.copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar mensagem
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleShareWhatsApp}
                  className="w-full bg-emerald-700 hover:bg-emerald-800"
                  size="sm"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Abrir WhatsApp
                </Button>

                <p className="text-xs text-gray-600 mt-2 text-center">
                  Copie a mensagem ou abra o WhatsApp para partilhar
                </p>
              </div>

              {/* Info */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-800">
                  💡 O PDF foi gerado com sucesso. Use o botão &quot;Descarregar PDF&quot; para o guardar no seu dispositivo.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-4 bg-gray-50">
              <Button
                onClick={closeShareModal}
                variant="ghost"
                className="w-full"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

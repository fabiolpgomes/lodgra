'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, Download, Share2, X, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface Property {
  id: string
  name: string
}

interface Reservation {
  id: string
  check_in: string
  check_out: string
  total_amount: number | null
  currency: string
  property_listings: {
    properties: {
      id: string
      name: string
      city: string
    }
  }
  guests: {
    first_name: string
    last_name: string
  } | null
}

interface ReservationsPdfGeneratorProps {
  properties: Property[]
  userRole: string
}

interface ShareModalState {
  isOpen: boolean
  fileName: string
  whatsappText: string
  copied: boolean
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

function calculateTotalNights(reservations: Reservation[]): number {
  return reservations.reduce((total, r) => {
    const checkIn = new Date(r.check_in)
    const checkOut = new Date(r.check_out)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    return total + nights
  }, 0)
}

function generateHtml(
  reservations: Reservation[],
  startDate: string,
  endDate: string,
  propertyId: string,
  isAdmin: boolean
): string {
  const totalAmount = reservations.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)
  const groupedByProperty = reservations.reduce((acc: Record<string, Reservation[]>, r) => {
    const propId = r.property_listings.properties.id
    if (!acc[propId]) acc[propId] = []
    acc[propId].push(r)
    return acc
  }, {})

  const propertyLabel = propertyId ? 'Propriedade Selecionada' : 'Todas as Propriedades'
  const totalNights = calculateTotalNights(reservations)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Relatório de Reservas</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; }
    h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    .info { margin: 20px 0; font-size: 13px; }
    .summary { background: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .summary-item { margin: 8px 0; }
    h2 { background: #3b82f6; color: white; padding: 10px; margin: 20px 0 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
    th { background: #f0f0f0; font-weight: bold; }
    tr:nth-child(even) { background: #f9f9f9; }
    .currency { text-align: right; font-weight: bold; color: #059669; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 11px; text-align: center; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Relatório de Reservas</h1>
    <p style="color: #666; font-size: 13px;">Home Stay - Gestão de Propriedades</p>

    <div class="info">
      <p><strong>Período:</strong> ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}</p>
      <p><strong>Escopo:</strong> ${propertyLabel}</p>
      <p><strong>Data de Geração:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>

    <div class="summary">
      <div class="summary-item"><strong>Total de Reservas:</strong> ${reservations.length}</div>
      ${isAdmin ? `<div class="summary-item"><strong>Receita Total:</strong> ${formatCurrency(totalAmount, 'EUR')}</div>` : ''}
      ${isAdmin ? `<div class="summary-item"><strong>Média por Reserva:</strong> ${reservations.length > 0 ? formatCurrency(totalAmount / reservations.length, 'EUR') : '€0,00'}</div>` : ''}
      <div class="summary-item"><strong>Noites Reservadas:</strong> ${totalNights}</div>
    </div>

    ${Object.entries(groupedByProperty)
      .map(([, propReservations]: [string, Reservation[]]) => {
        const propData = propReservations[0]?.property_listings.properties
        return `
          <h2>${propData?.name || 'Propriedade'} - ${propData?.city || ''}</h2>
          <table>
            <thead>
              <tr>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Hóspede</th>
                <th>Noites</th>
                ${isAdmin ? '<th>Valor</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${propReservations
                .map(r => {
                  const checkIn = new Date(r.check_in)
                  const checkOut = new Date(r.check_out)
                  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
                  const guest = r.guests
                  const guestName = guest ? guest.first_name + ' ' + guest.last_name : 'N/A'
                  return `<tr>
                    <td>${checkIn.toLocaleDateString('pt-BR')}</td>
                    <td>${checkOut.toLocaleDateString('pt-BR')}</td>
                    <td>${guestName}</td>
                    <td>${nights}</td>
                    ${isAdmin ? '<td class="currency">' + formatCurrency(Number(r.total_amount) || 0, r.currency || 'EUR') + '</td>' : ''}
                  </tr>`
                })
                .join('')}
            </tbody>
          </table>
        `
      })
      .join('')}

    <div class="footer">
      <p>Este relatório foi gerado automaticamente pelo sistema Home Stay.</p>
      <p>&copy; ${new Date().getFullYear()} Home Stay. Todos os direitos reservados.</p>
    </div>
  </div>

</body>
</html>`
}

export function ReservationsPdfGenerator({ properties, userRole }: ReservationsPdfGeneratorProps) {
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [shareModal, setShareModal] = useState<ShareModalState>({
    isOpen: false,
    fileName: '',
    whatsappText: '',
    copied: false,
  })
  const pdfParamsRef = useRef<{ startDate: string; endDate: string; propertyId: string }>({
    startDate: '',
    endDate: '',
    propertyId: '',
  })

  async function handleGeneratePdf() {
    if (!startDate || !endDate) {
      toast.error('Por favor, selecione um período')
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Data inicial não pode ser depois da data final')
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        propertyId: selectedPropertyId === 'all' ? '' : selectedPropertyId,
        role: userRole,
      })

      const response = await fetch(`/api/reports/reservations-pdf?${params}`)
      if (!response.ok) throw new Error('Erro ao gerar PDF')

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const data: any = await response.json()
      /* eslint-enable @typescript-eslint/no-explicit-any */

      // Store params for download
      pdfParamsRef.current = {
        startDate: data.startDate,
        endDate: data.endDate,
        propertyId: data.propertyId,
      }

      const fileName = `reservas-${startDate}-${endDate}.pdf`

      // Show share modal with data
      const whatsappText = `📋 Relatório de Reservas\n\nPeríodo: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}\nTotal de Reservas: ${data.reservations.length}\n\nFaça o download do PDF para visualizar detalhes completos.`

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
      toast.error('PDF não disponível')
      return
    }

    try {
      const queryParams = new URLSearchParams({
        startDate: params.startDate,
        endDate: params.endDate,
        propertyId: params.propertyId,
        role: userRole,
      })

      // Open report in new window - user can click "Download PDF" button there
      window.open(`/api/reports/reservations-pdf-download?${queryParams}`, '_blank')
      toast.success('Abrindo relatório em nova aba...')
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao abrir relatório')
    }
  }

  function handleCopyText() {
    navigator.clipboard.writeText(shareModal.whatsappText)
    setShareModal(prev => ({ ...prev, copied: true }))
    toast.success('Copiado para a área de transferência!')

    // Reset copied state after 2 seconds
    setTimeout(() => {
      setShareModal(prev => ({ ...prev, copied: false }))
    }, 2000)
  }

  function handleShareWhatsApp() {
    const text = `${shareModal.whatsappText}\n\n💾 Faça o download do PDF clicando no botão "Download PDF"!`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  function closeShareModal() {
    setShareModal(prev => ({ ...prev, isOpen: false }))
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Gerar PDF de Reservas</h2>
          <p className="text-sm text-gray-600">Exporte um relatório de reservas em PDF</p>
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
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Todas as propriedades</option>
            {properties.map((prop) => (
              <option key={prop.id} value={prop.id}>
                {prop.name}
              </option>
            ))}
          </select>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate" className="mb-2 block">
              Data Inicial
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
              Data Final
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
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800 text-sm">
            O relatório incluirá todas as reservas confirmadas dentro do período selecionado.
          </AlertDescription>
        </Alert>

        {/* Buttons */}
        <div className="flex justify-center">
          <Button
            onClick={handleGeneratePdf}
            disabled={loading}
            className="w-full md:w-auto px-8"
            size="lg"
          >
            <FileText className="mr-2 h-5 w-5" />
            {loading ? 'Gerando PDF...' : 'Gerar PDF'}
          </Button>
        </div>
      </div>

      {/* Share Modal */}
      {shareModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-6">
              <h2 className="text-xl font-semibold text-gray-900">PDF Gerado!</h2>
              <button
                onClick={closeShareModal}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm font-medium">
                  ✓ Arquivo: <span className="font-semibold">{shareModal.fileName}</span>
                </p>
              </div>

              {/* Download Button */}
              <Button
                onClick={handleDownloadPdf}
                className="w-full"
                size="lg"
              >
                <Download className="mr-2 h-5 w-5" />
                Download PDF
              </Button>

              {/* Share Section */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Compartilhar via WhatsApp
                </p>

                {/* Copy Text Button */}
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
                      Copiar Mensagem
                    </>
                  )}
                </Button>

                {/* WhatsApp Share Button */}
                <Button
                  onClick={handleShareWhatsApp}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Abrir WhatsApp
                </Button>

                <p className="text-xs text-gray-500 mt-2 text-center">
                  Copie a mensagem ou abra o WhatsApp para compartilhar
                </p>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  💡 O PDF foi gerado com sucesso. Use o botão &quot;Download PDF&quot; para salvá-lo no seu dispositivo.
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

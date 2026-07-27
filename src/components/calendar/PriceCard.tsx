'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface PriceCardProps {
  title: string
  value: string | number
  currency?: string
  action?: 'toggle' | 'edit' | 'remove'
  onAction?: () => void
  onSave?: (data: PricingModalData) => void
  isActive?: boolean
  editableValue?: number | null
  minPrice?: number | null
  maxPrice?: number | null
  onToggleSmartPricing?: (enabled: boolean) => void
}

interface PricingModalData {
  base_price?: number
  min_price?: number
  max_price?: number
}

export function PriceCard({
  title,
  value,
  currency = 'EUR',
  action,
  onAction,
  onSave,
  isActive = true,
  editableValue,
  minPrice,
  maxPrice,
  onToggleSmartPricing,
}: PriceCardProps) {
  const [showModal, setShowModal] = useState(false)
  const [basePriceInput, setBasePriceInput] = useState(editableValue?.toString() || '')
  const [minPriceInput, setMinPriceInput] = useState(minPrice?.toString() || '')
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice?.toString() || '')
  const [smartPricingEnabled, setSmartPricingEnabled] = useState(isActive)
  const [loading, setLoading] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    if (action === 'edit' && onSave) {
      e.preventDefault()
      setBasePriceInput(editableValue?.toString() || '')
      setMinPriceInput(minPrice?.toString() || '')
      setMaxPriceInput(maxPrice?.toString() || '')
      setSmartPricingEnabled(isActive)
      setShowModal(true)
    } else if (action && onAction) {
      e.preventDefault()
      onAction()
    }
  }

  const handleToggleSmartPricing = () => {
    setSmartPricingEnabled(!smartPricingEnabled)
    onToggleSmartPricing?.(!smartPricingEnabled)
  }

  const handleSave = async () => {
    // Validações
    if (smartPricingEnabled) {
      // Modo inteligente: precisamos de min e max
      const minVal = parseFloat(minPriceInput)
      const maxVal = parseFloat(maxPriceInput)

      if (isNaN(minVal) || minVal < 1) {
        toast.error('Preço Mínimo deve ser >= 1')
        return
      }
      if (isNaN(maxVal) || maxVal < 1) {
        toast.error('Preço Máximo deve ser >= 1')
        return
      }
      if (minVal > maxVal) {
        toast.error('Preço Mínimo não pode ser maior que Máximo')
        return
      }

      setLoading(true)
      try {
        await onSave?.({
          min_price: minVal,
          max_price: maxVal,
        })
        toast.success('Preços atualizado')
        setShowModal(false)
      } catch (error) {
        console.error('Error saving prices:', error)
        toast.error('Erro ao guardar preços')
      } finally {
        setLoading(false)
      }
    } else {
      // Modo base: apenas preço base
      const baseVal = parseFloat(basePriceInput)

      if (isNaN(baseVal) || baseVal < 1) {
        toast.error('Preço Base deve ser >= 1')
        return
      }

      setLoading(true)
      try {
        await onSave?.({
          base_price: baseVal,
        })
        toast.success('Preço Base atualizado')
        setShowModal(false)
      } catch (error) {
        console.error('Error saving base price:', error)
        toast.error('Erro ao guardar preço')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <>
      <div className="price-card" role="presentation">
        <div className="price-card-content">
          <h4 className="price-title">{title}</h4>
          <div className="price-value">
            {typeof value === 'number' ? (
              <>
                <span className="currency">{currency}</span>
                <span className="amount">{value.toFixed(0)}</span>
              </>
            ) : (
              <span className="amount">{value}</span>
            )}
          </div>
        </div>

        {action === 'toggle' && (
          <button
            className={`toggle-button ${smartPricingEnabled ? 'active' : 'inactive'}`}
            onClick={handleToggleSmartPricing}
            aria-label={`Toggle ${title}`}
          >
            <div className="toggle-switch" />
          </button>
        )}

        {action === 'edit' && (
          <button
            className="action-button edit"
            onClick={handleClick}
            aria-label={`Edit ${title}`}
          >
            ✎
          </button>
        )}

        {action === 'remove' && (
          <button
            className="action-button remove"
            onClick={handleClick}
            aria-label={`Remove ${title}`}
          >
            ✕
          </button>
        )}
      </div>

      {action === 'edit' && (
        <div className={`modal ${showModal ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Editar Preços</h2>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Toggle Preço Inteligente */}
              <div className="form-group toggle-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={smartPricingEnabled}
                    onChange={handleToggleSmartPricing}
                    className="toggle-input"
                  />
                  <span className="toggle-text">Preço Inteligente</span>
                  <span className="toggle-description">
                    Ajusta automaticamente baseado em demanda
                  </span>
                </label>
              </div>

              {/* Exibir campos baseado no toggle */}
              {!smartPricingEnabled ? (
                // Modo Base: apenas Preço Base
                <div className="form-group">
                  <label htmlFor="base-price" className="form-label">
                    Preço Base ({currency})
                  </label>
                  <input
                    id="base-price"
                    type="number"
                    min="1"
                    step="0.01"
                    value={basePriceInput}
                    onChange={(e) => setBasePriceInput(e.target.value)}
                    placeholder="Ex: 149"
                    className="form-input"
                  />
                </div>
              ) : (
                // Modo Inteligente: Preço Mínimo + Máximo
                <>
                  <div className="form-group">
                    <label htmlFor="min-price" className="form-label">
                      Preço Mínimo ({currency})
                    </label>
                    <input
                      id="min-price"
                      type="number"
                      min="1"
                      step="0.01"
                      value={minPriceInput}
                      onChange={(e) => setMinPriceInput(e.target.value)}
                      placeholder="Ex: 80"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="max-price" className="form-label">
                      Preço Máximo ({currency})
                    </label>
                    <input
                      id="max-price"
                      type="number"
                      min="1"
                      step="0.01"
                      value={maxPriceInput}
                      onChange={(e) => setMaxPriceInput(e.target.value)}
                      placeholder="Ex: 190"
                      className="form-input"
                    />
                  </div>

                  <div className="info-box">
                    <p className="info-text">
                      ℹ️ Preço inteligente usa automaticamente o preço mínimo em baixa demanda e máximo em alta demanda.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowModal(false)}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          align-items: center;
          justify-content: center;
        }

        .modal.open {
          display: flex;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 450px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          padding: 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-title {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .modal-close:hover {
          background-color: #f3f4f6;
        }

        .modal-body {
          padding: 24px;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .toggle-group {
          margin-bottom: 32px;
          padding: 16px;
          background-color: #f9fafb;
          border-radius: 8px;
        }

        .toggle-label {
          display: flex;
          align-items: flex-start;
          cursor: pointer;
          gap: 12px;
        }

        .toggle-input {
          width: 20px;
          height: 20px;
          margin-top: 2px;
          cursor: pointer;
          accent-color: #2563eb;
        }

        .toggle-text {
          font-weight: 600;
          color: #1f2937;
          display: block;
        }

        .toggle-description {
          font-size: 14px;
          color: #6b7280;
          margin-top: 4px;
        }

        .form-label {
          display: block;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .form-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .info-box {
          padding: 12px;
          background-color: #eff6ff;
          border-left: 4px solid #3b82f6;
          border-radius: 4px;
          margin-top: 16px;
        }

        .info-text {
          margin: 0;
          font-size: 14px;
          color: #1e40af;
          line-height: 1.5;
        }

        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-family: inherit;
        }

        .btn-primary {
          background-color: #1f2937;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #111827;
        }

        .btn-secondary {
          background-color: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #e5e7eb;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
  )
}

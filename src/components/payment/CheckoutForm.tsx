'use client'

import { useState } from 'react'

interface CheckoutFormProps {
  clientSecret: string
  _bookingId?: string
  amountEUR: number
  lodgraFee: number
  ownerAmount: number
  onSuccess: () => void
  onError: (error: string) => void
}

export function CheckoutForm({
  clientSecret,
  _bookingId,
  amountEUR,
  lodgraFee,
  ownerAmount,
  onSuccess,
  onError,
}: CheckoutFormProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsProcessing(true)

    try {
      // Simulate payment processing with client secret
      if (!clientSecret) {
        throw new Error('Payment intent not created')
      }

      // In production, would use Stripe.js to confirm payment
      // For now, simulate success
      await new Promise((resolve) => setTimeout(resolve, 2000))

      if (Math.random() > 0.1) {
        // 90% success rate simulation
        onSuccess()
      } else {
        onError('Payment processing failed')
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Total Amount</p>
            <p className="text-lg font-semibold">€{amountEUR.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-500">Lodgra Fee (15%)</p>
            <p className="text-lg font-semibold">€{lodgraFee.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-500">Owner Receives (85%)</p>
            <p className="text-lg font-semibold">€{ownerAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-blue-50">
        <p className="text-sm text-gray-600">
          Client Secret: <code className="text-xs">{clientSecret.substring(0, 20)}...</code>
        </p>
      </div>

      <button
        type="submit"
        disabled={isProcessing}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isProcessing ? 'Processing...' : `Pay €${amountEUR.toFixed(2)}`}
      </button>
    </form>
  )
}

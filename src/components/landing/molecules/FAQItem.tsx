'use client'

import React, { useState } from 'react'
import { trackFAQInteraction } from '@/lib/analytics/client'

interface FAQItemProps {
  question: string
  answer: string
  index?: number
}

export const FAQItem: React.FC<FAQItemProps> = ({ question, answer, index = 0 }) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    const newState = !isOpen
    trackFAQInteraction(index, newState ? 'open' : 'close')
    setIsOpen(newState)
  }

  return (
    <div className="border border-gray-200 rounded-xl p-6 mb-4 bg-white hover:border-lodgra-primary/30 transition-colors duration-300">
      <button
        onClick={handleToggle}
        className="flex items-center justify-between w-full text-left hover:text-lodgra-primary transition-colors duration-300"
        aria-expanded={isOpen}
        aria-label={`${isOpen ? 'Hide' : 'Show'} answer: ${question}`}
      >
        <span className="font-poppins font-semibold text-lg text-lodgra-primary">{question}</span>
        <svg
          className={`w-6 h-6 text-lodgra-primary transition-transform duration-300 flex-shrink-0 ml-4 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-5 pt-5 border-t border-gray-200 animate-in fade-in duration-200">
          <p className="text-gray-700 font-inter leading-relaxed text-base">{answer}</p>
        </div>
      )}
    </div>
  )
}

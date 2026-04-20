import React from 'react'
import { Container } from '../atoms/Container'

interface ValuePropProps {
  title: string
  description: string
  bullets: string[]
}

export const ValueProposition: React.FC<ValuePropProps> = ({
  title,
  description,
  bullets,
}) => (
  <section className="bg-white dark:bg-gray-950 py-20 md:py-32">
    <Container>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left: Text */}
        <div>
          <h2 className="font-poppins font-bold text-4xl md:text-5xl lg:text-6xl text-lodgra-primary mb-6 leading-tight tracking-tight">
            {title}
          </h2>

          <p className="font-inter font-light text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed mb-12">
            {description}
          </p>

          <ul className="space-y-5">
            {bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-4">
                <svg className="w-6 h-6 text-lodgra-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300 text-base font-inter leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Illustration placeholder */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="w-full aspect-square bg-lodgra-light dark:bg-gray-800 rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-lodgra-primary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-lodgra-primary font-inter text-sm font-medium">Real-Time Analytics</p>
            </div>
          </div>
        </div>
      </div>
    </Container>
  </section>
)

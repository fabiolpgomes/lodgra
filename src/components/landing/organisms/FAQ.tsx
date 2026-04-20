import React from 'react'
import { Container } from '../atoms/Container'
import { FAQItem } from '../molecules/FAQItem'

interface FAQQuestion {
  question: string
  answer: string
}

interface FAQProps {
  title: string
  questions: FAQQuestion[]
}

export const FAQ: React.FC<FAQProps> = ({ title, questions }) => (
  <section className="bg-gray-50/50 dark:bg-gray-900/50 py-20 md:py-32">
    <Container>
      <div className="text-center mb-16">
        <h2 className="font-poppins font-bold text-4xl md:text-5xl lg:text-6xl text-lodgra-primary mb-4 leading-tight tracking-tight">
          {title}
        </h2>
      </div>

      <div className="max-w-3xl mx-auto">
        {questions.map((faq, idx) => (
          <FAQItem
            key={idx}
            question={faq.question}
            answer={faq.answer}
          />
        ))}
      </div>
    </Container>
  </section>
)

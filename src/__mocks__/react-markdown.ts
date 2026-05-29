// Mock for react-markdown ESM module
import React from 'react'

export default function ReactMarkdown({ children }: { children: string }) {
  return React.createElement('div', null, children)
}

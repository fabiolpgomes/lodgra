'use client'

import dynamic from 'next/dynamic'

const Placeholder = () => (
  <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
  </div>
)

export const LazyPropertyLightbox = dynamic(
  () => import('@/components/common/public/gallery/PropertyLightbox').then(mod => mod.PropertyLightbox),
  { ssr: false, loading: Placeholder }
)

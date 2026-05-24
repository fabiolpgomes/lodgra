import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lodgra',
  robots: { index: true, follow: true },
}

export async function generateStaticParams() {
  return [{}]
}

export default function RootPage() {
  return <div>Root page - middleware should redirect this to /[locale]</div>
}


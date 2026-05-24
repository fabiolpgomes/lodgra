export async function generateStaticParams() {
  return [{ locale: 'pt-BR' }, { locale: 'en-US' }, { locale: 'es' }];
}

export default function Page() {
  return <h1>Test</h1>
}

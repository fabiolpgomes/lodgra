export default async function LocalizedRootPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div>
      <h1>Landing Page - {locale}</h1>
      <p>If you see this, the route is working!</p>
    </div>
  )
}

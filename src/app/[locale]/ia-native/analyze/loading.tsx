export default function IaNativeAnalyzeLoading() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
        <div className="w-full max-w-4xl space-y-6 rounded-3xl border border-brand-border-soft bg-white p-8 shadow-sm">
          <div className="space-y-3">
            <div className="h-4 w-24 rounded-full bg-brand-blue/10" />
            <div className="h-10 w-3/4 rounded-2xl bg-brand-surface" />
            <div className="h-4 w-full rounded-full bg-brand-surface" />
            <div className="h-4 w-5/6 rounded-full bg-brand-surface" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="h-64 rounded-3xl bg-brand-surface" />
            <div className="space-y-4">
              <div className="h-28 rounded-3xl bg-brand-surface" />
              <div className="h-28 rounded-3xl bg-brand-surface" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

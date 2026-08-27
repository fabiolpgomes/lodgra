export default function IaNativeLoading() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="w-full max-w-3xl space-y-6 rounded-3xl border border-brand-border-soft bg-white p-8 shadow-sm">
          <div className="space-y-3">
            <div className="h-4 w-28 rounded-full bg-brand-blue/10" />
            <div className="h-10 w-2/3 rounded-2xl bg-brand-surface" />
            <div className="h-4 w-full rounded-full bg-brand-surface" />
            <div className="h-4 w-5/6 rounded-full bg-brand-surface" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-24 rounded-2xl bg-brand-surface" />
            <div className="h-24 rounded-2xl bg-brand-surface" />
            <div className="h-24 rounded-2xl bg-brand-surface" />
          </div>
        </div>
      </div>
    </div>
  )
}

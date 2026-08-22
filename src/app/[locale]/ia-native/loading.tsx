export default function IaNativeLoading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,162,39,0.08),transparent_30%),linear-gradient(180deg,#fbf8f1_0%,#fffdf9_100%)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="h-8 w-40 rounded-full bg-brand-blue/10 animate-pulse" />
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="h-[420px] rounded-[28px] border border-brand-border-soft bg-white/70 p-6 shadow-sm animate-pulse" />
          <div className="grid gap-4">
            <div className="h-40 rounded-[24px] border border-brand-border-soft bg-white/70 p-6 shadow-sm animate-pulse" />
            <div className="h-40 rounded-[24px] border border-brand-border-soft bg-white/70 p-6 shadow-sm animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="h-28 rounded-2xl border border-brand-border-soft bg-white/70 animate-pulse" />
          <div className="h-28 rounded-2xl border border-brand-border-soft bg-white/70 animate-pulse" />
          <div className="h-28 rounded-2xl border border-brand-border-soft bg-white/70 animate-pulse" />
          <div className="h-28 rounded-2xl border border-brand-border-soft bg-white/70 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

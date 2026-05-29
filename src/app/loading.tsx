export default function Loading() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-gray-100" />
            <div className="h-5 w-24 rounded bg-gray-100" />
          </div>
          <div className="hidden h-9 w-28 rounded bg-gray-100 sm:block" />
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_420px]">
          <div className="animate-pulse space-y-5">
            <div className="h-4 w-36 rounded bg-emerald-100" />
            <div className="h-10 w-full max-w-xl rounded bg-gray-200" />
            <div className="h-10 w-5/6 max-w-lg rounded bg-gray-200" />
            <div className="h-5 w-full max-w-md rounded bg-gray-100" />
            <div className="h-5 w-4/5 max-w-sm rounded bg-gray-100" />
          </div>

          <div className="animate-pulse rounded-lg border border-gray-100 bg-gray-50 p-4 shadow-sm">
            <div className="aspect-[4/3] rounded-md bg-gray-200" />
            <div className="mt-4 h-5 w-3/4 rounded bg-gray-200" />
            <div className="mt-3 h-4 w-1/2 rounded bg-gray-100" />
          </div>
        </section>
      </div>
    </main>
  )
}

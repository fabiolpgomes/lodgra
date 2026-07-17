export default function BookingLoading() {
  return (
    <div className="min-h-screen bg-[#F7F5EF] font-light text-[#3c3c3c]">
      <header className="bg-white border-b border-[#e6e6e6] px-6 h-[64px] flex items-center justify-center">
        <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="h-5 w-40 bg-[#f1f1f1]" />
          <div className="h-4 w-32 bg-[#f1f1f1]" />
        </div>
      </header>

      <section className="bg-white px-6 py-12 border-b border-[#e6e6e6]">
        <div className="max-w-[1440px] mx-auto">
          <div className="h-12 w-full max-w-xl bg-[#f1f1f1] mb-4" />
          <div className="h-5 w-full max-w-md bg-[#f1f1f1]" />
          <div className="w-[48px] h-[4px] bg-[#1c69d4] mt-6" />
        </div>
      </section>

      <section className="bg-white border-b border-[#e6e6e6] px-6 py-8">
        <div className="max-w-[1440px] mx-auto">
          <div className="h-28 bg-[#F7F5EF] border border-[#e6e6e6]" />
        </div>
      </section>

      <main className="px-6 py-12">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white border border-[#e6e6e6] p-6">
              <div className="aspect-[4/3] bg-[#f1f1f1] mb-6" />
              <div className="h-6 bg-[#f1f1f1] w-3/4 mb-4" />
              <div className="h-4 bg-[#f1f1f1] w-1/2 mb-8" />
              <div className="h-12 bg-[#10203E]/10" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

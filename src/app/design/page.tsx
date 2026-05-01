import { notFound } from 'next/navigation'
import { Logo } from '@/components/ui/Logo'
import { BRAND, ACCENT, CTA, SEMANTIC, SHADOW, RADIUS } from '@/lib/design/tokens'

export const dynamic = 'force-dynamic'

export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <DesignPageContent />
}

function Swatch({ name, hex, className }: { name: string; hex: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`h-16 w-full rounded-xl border border-black/5 ${className ?? ''}`}
        style={{ backgroundColor: hex }}
      />
      <p className="text-xs font-mono text-zinc-500">{name}</p>
      <p className="text-xs font-mono text-zinc-400">{hex}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2 className="text-lg font-bold text-zinc-800 mb-6 pb-2 border-b border-zinc-200">{title}</h2>
      {children}
    </section>
  )
}

function DesignPageContent() {
  return (
    <div className="min-h-screen bg-zinc-50 px-8 py-12 font-lodgra-body">
      <header className="max-w-5xl mx-auto mb-16">
        <div className="flex items-center gap-4 mb-3">
          <Logo size="lg" />
          <h1 className="text-3xl font-bold text-lodgra-blue font-lodgra-heading">Design System</h1>
        </div>
        <p className="text-zinc-500 text-sm">Paleta de cores, tipografia e componentes — Lodgra v1.0</p>
      </header>

      <main className="max-w-5xl mx-auto">

        {/* Brand Scale */}
        <Section title="Brand Scale — Lodgra Blue">
          <div className="grid grid-cols-5 md:grid-cols-11 gap-3">
            {(Object.entries(BRAND).filter(([k]) => !isNaN(Number(k))) as [string, string][]).map(([shade, hex]) => (
              <Swatch key={shade} name={`brand-${shade}`} hex={hex} />
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-400 font-mono">brand-800 = #1E3A8A — Azul Confiança (primary)</p>
        </Section>

        {/* Accent Scale */}
        <Section title="Accent Scale — Lodgra Gold">
          <div className="grid grid-cols-5 gap-3 max-w-md">
            {(Object.entries(ACCENT).filter(([k]) => !isNaN(Number(k))) as [string, string][]).map(([shade, hex]) => (
              <Swatch key={shade} name={`accent-${shade}`} hex={hex} />
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-400 font-mono">accent-500 = #D4AF37 — Ouro Próspero (CTAs, destaques)</p>
        </Section>

        {/* Flat tokens */}
        <Section title="Tokens Planos (Tailwind)">
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            <Swatch name="lodgra-blue" hex="#1E3A8A" />
            <Swatch name="lodgra-gold" hex="#D4AF37" />
            <Swatch name="lodgra-green" hex="#059669" />
            <Swatch name="lodgra-dark" hex="#374151" />
            <Swatch name="lodgra-gray" hex="#F3F4F6" className="border border-zinc-200" />
          </div>
        </Section>

        {/* Semantic */}
        <Section title="Semânticos">
          <div className="grid grid-cols-4 gap-3 max-w-xs">
            <Swatch name="success" hex={SEMANTIC.success} />
            <Swatch name="warning" hex={SEMANTIC.warning} />
            <Swatch name="error" hex={SEMANTIC.error} />
            <Swatch name="info" hex={SEMANTIC.info} />
          </div>
        </Section>

        {/* CTA */}
        <Section title="CTA — Verde Crescimento">
          <div className="flex gap-4">
            <button
              className="px-8 py-3 rounded-xl text-white font-bold text-sm"
              style={{ backgroundColor: CTA.default }}
            >
              Botão CTA (default)
            </button>
            <button
              className="px-8 py-3 rounded-xl text-white font-bold text-sm"
              style={{ backgroundColor: CTA.hover }}
            >
              Botão CTA (hover)
            </button>
          </div>
          <p className="mt-3 text-xs text-zinc-400 font-mono">{CTA.default} / {CTA.hover}</p>
        </Section>

        {/* Typography */}
        <Section title="Tipografia">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-zinc-400 mb-1 font-mono">font-lodgra-heading (Poppins) — headings</p>
              <p className="text-4xl font-bold text-lodgra-blue font-lodgra-heading">Gestão profissional</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400 mb-1 font-mono">font-lodgra-body (Inter) — body</p>
              <p className="text-base text-lodgra-dark font-lodgra-body leading-relaxed">
                A plataforma definitiva para quem busca escala e prosperidade. Gestão inteligente com dados em tempo real.
              </p>
            </div>
            <div className="space-y-1 pt-2">
              {(['5xl', '4xl', '3xl', '2xl', 'xl', 'lg', 'base', 'sm', 'xs'] as const).map(size => (
                <p key={size} className={`text-${size} text-zinc-700 font-lodgra-heading`}>
                  <span className="font-mono text-zinc-300 text-xs mr-4">text-{size}</span>
                  Lodgra — Gestão de Propriedades
                </p>
              ))}
            </div>
          </div>
        </Section>

        {/* Logo variants */}
        <Section title="Logo — Variantes">
          <div className="flex flex-wrap gap-8 items-center">
            <div className="flex flex-col gap-2 items-center">
              <Logo size="lg" variant="default" />
              <span className="text-xs text-zinc-400">default / lg</span>
            </div>
            <div className="flex flex-col gap-2 items-center">
              <Logo size="md" variant="default" />
              <span className="text-xs text-zinc-400">default / md</span>
            </div>
            <div className="flex flex-col gap-2 items-center">
              <Logo size="sm" variant="default" />
              <span className="text-xs text-zinc-400">default / sm</span>
            </div>
            <div className="p-4 bg-lodgra-blue rounded-xl flex flex-col gap-2 items-center">
              <Logo size="md" variant="white" />
              <span className="text-xs text-white/60">white / md</span>
            </div>
            <div className="flex flex-col gap-2 items-center">
              <Logo size="md" variant="compact" />
              <span className="text-xs text-zinc-400">compact / md</span>
            </div>
          </div>
        </Section>

        {/* Shadows */}
        <Section title="Sombras">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {(Object.entries(SHADOW) as [string, string][]).map(([name, value]) => (
              <div key={name} className="p-4 bg-white rounded-xl flex items-center justify-center" style={{ boxShadow: value }}>
                <span className="text-xs font-mono text-zinc-400">{name}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Border Radius */}
        <Section title="Border Radius">
          <div className="flex flex-wrap gap-4 items-end">
            {(Object.entries(RADIUS) as [string, string][]).map(([name, value]) => (
              <div key={name} className="flex flex-col gap-1.5 items-center">
                <div
                  className="w-16 h-16 bg-brand-200 border-2 border-brand-400"
                  style={{ borderRadius: value }}
                />
                <span className="text-xs font-mono text-zinc-400">{name}</span>
                <span className="text-xs font-mono text-zinc-300">{value}</span>
              </div>
            ))}
          </div>
        </Section>

      </main>
    </div>
  )
}

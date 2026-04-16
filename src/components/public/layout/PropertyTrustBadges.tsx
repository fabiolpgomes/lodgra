import { ShieldCheck, Tag, Headphones } from 'lucide-react'

export function PropertyTrustBadges() {
  const badges = [
    { icon: ShieldCheck, label: 'Pagamento seguro' },
    { icon: Tag,         label: 'Sem comissões' },
    { icon: Headphones,  label: 'Suporte 24h' },
  ]

  return (
    <div className="flex flex-wrap justify-center gap-4 text-xs text-hs-neutral-500">
      {badges.map(({ icon: Icon, label }) => (
        <span key={label} className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-hs-brand-400" />
          {label}
        </span>
      ))}
    </div>
  )
}

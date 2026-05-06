'use client'

import * as LucideIcons from 'lucide-react'
import { LucideProps } from 'lucide-react'

type IconName = keyof typeof LucideIcons

export function AmenityIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = LucideIcons[name as IconName] as React.ComponentType<LucideProps> | undefined
  if (!Icon) return <LucideIcons.Star {...props} />
  return <Icon {...props} />
}

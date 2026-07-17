'use client'

import React from 'react'
import Link from 'next/link'
import { Container } from '@/components/landing/atoms/Container'

export const PublicFooter: React.FC = () => {
  const currentYear = new Date().getFullYear()

  const navigationLinks = [
    { href: '/', label: 'Home' },
    { href: '/features', label: 'Funcionalidades' },
    { href: '/pricing', label: 'Planos' },
    { href: '/docs', label: 'Documentação' },
  ]

  const legalLinks = [
    { href: '/terms', label: 'Termos de Serviço' },
    { href: '/privacy', label: 'Política de Privacidade' },
  ]

  const supportLinks = [
    { href: 'mailto:suporte@lodgra.io', label: 'Contactar Suporte' },
    { href: 'https://lodgra.io', label: 'Website Oficial' },
  ]

  const clientLinks = [
    { href: 'https://algarve-home-stay.lodgra.io', label: 'Algarve Home Stay', external: true },
    { href: 'https://algarvehomestay.pt', label: 'AHS Informações', external: true },
  ]

  return (
    <footer className="bg-lodgra-blue text-white py-12 sm:py-16 mt-16">
      <Container>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Branding */}
          <div>
            <h3 className="font-black text-lg mb-4">Lodgra</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Gestão completa de imóveis por temporada. Sincronização automática, análise de lucros e controle de equipa.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider">Navegação</h4>
            <ul className="space-y-2">
              {navigationLinks.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-300 hover:text-be-blue transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider">Suporte</h4>
            <ul className="space-y-2">
              {supportLinks.map(link => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="text-sm text-gray-300 hover:text-be-blue transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Clientes */}
          <div>
            <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider">Clientes</h4>
            <ul className="space-y-2">
              {clientLinks.map(link => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-300 hover:text-be-blue transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8 text-center text-sm text-gray-400">
          <p>© {currentYear} Lodgra. Todos os direitos reservados.</p>
        </div>
      </Container>
    </footer>
  )
}

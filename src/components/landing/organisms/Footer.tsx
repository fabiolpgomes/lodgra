import React from 'react'
import { Container } from '../atoms/Container'

interface FooterLink {
  label: string
  href: string
}

interface FooterProps {
  copyright: string
  productLinks?: FooterLink[]
  companyLinks?: FooterLink[]
  supportLinks?: FooterLink[]
  legalLinks?: FooterLink[]
  socialLinks?: FooterLink[]
}

export const Footer: React.FC<FooterProps> = ({
  copyright,
  productLinks = [],
  companyLinks = [],
  supportLinks = [],
  legalLinks = [],
  socialLinks = [],
}) => (
  <footer className="bg-lodgra-neutral text-white py-8 sm:py-12">
    <Container>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8 mb-8 sm:mb-12">
        {/* Branding */}
        <div>
          <div className="font-poppins font-bold text-xl mb-3 text-white">Lodgra</div>
          <p className="text-gray-400 text-xs font-inter leading-relaxed">
            Revenue optimization for property managers.
          </p>
        </div>

        {/* Product */}
        <div>
          <h4 className="font-poppins font-semibold mb-4 text-white text-sm">Produto</h4>
          <ul className="space-y-2">
            {productLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-gray-400 hover:text-lodgra-gold transition-colors text-xs font-inter"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="font-poppins font-semibold mb-4 text-white text-sm">Empresa</h4>
          <ul className="space-y-2">
            {companyLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-gray-400 hover:text-lodgra-gold transition-colors text-xs font-inter"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="font-poppins font-semibold mb-4 text-white text-sm">Suporte</h4>
          <ul className="space-y-2">
            {supportLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-gray-400 hover:text-lodgra-gold transition-colors text-xs font-inter"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="font-poppins font-semibold mb-4 text-white text-sm">Legal</h4>
          <ul className="space-y-2">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-gray-400 hover:text-lodgra-gold transition-colors text-xs font-inter"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-8 text-center text-gray-400 text-sm">
        <p>{copyright}</p>
      </div>
    </Container>
  </footer>
)

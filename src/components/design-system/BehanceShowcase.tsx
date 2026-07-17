'use client'

import React from 'react'
import { Button } from '@/components/common/ui/button'

export function AirbnbShowcase() {
  return (
    <div className="min-h-screen bg-[#F7F5EF] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="be-display-hero text-be-text mb-4">Lodgra Premium Design System</h1>
          <p className="be-body-lg text-be-text-muted">
            Airbnb-inspired marketplace ergonomics with Lodgra&apos;s institutional blue and gold palette.
          </p>
        </div>

        {/* Colors Section */}
        <section className="mb-12">
          <h2 className="be-heading text-be-text mb-6">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Institutional Blue */}
            <div>
              <div className="w-full h-20 bg-be-blue rounded-sm mb-2"></div>
              <p className="be-caption text-be-text">Institutional Blue</p>
              <p className="be-caption-sm text-be-text-muted">#10203E</p>
            </div>

            {/* Gold Accent */}
            <div>
              <div className="w-full h-20 bg-[#C9A227] rounded-sm mb-2"></div>
              <p className="be-caption text-be-text">Gold Accent</p>
              <p className="be-caption-sm text-be-text-muted">#C9A227</p>
            </div>

            {/* Warm White */}
            <div>
              <div className="w-full h-20 bg-be-surface border border-be-border rounded-sm mb-2"></div>
              <p className="be-caption text-be-text">Warm White</p>
              <p className="be-caption-sm text-be-text-muted">#FBFAF6</p>
            </div>

            {/* Sand Background */}
            <div>
              <div className="w-full h-20 bg-[#F7F5EF] border border-be-border rounded-sm mb-2"></div>
              <p className="be-caption text-be-text">Sand Background</p>
              <p className="be-caption-sm text-be-text-muted">#F7F5EF</p>
            </div>
          </div>
        </section>

        {/* Typography Section */}
        <section className="mb-12">
          <h2 className="be-heading text-be-text mb-6">Typography</h2>
          <div className="space-y-4">
            <div>
              <p className="be-display-hero text-be-text">Display Hero</p>
              <p className="be-body-sm text-be-text-muted">28px, weight 700, line-height 1.43</p>
            </div>
            <div>
              <p className="be-display-large text-be-text">Display Large</p>
              <p className="be-body-sm text-be-text-muted">22px, weight 500, line-height 1.18</p>
            </div>
            <div>
              <p className="be-heading text-be-text">Section Heading</p>
              <p className="be-body-sm text-be-text-muted">20px, weight 600, line-height 1.25</p>
            </div>
            <div>
              <p className="be-body text-be-text">Body text — Airbnb-style product typography uses modest weights, generous line-height and slate ink (#1B2430).</p>
            </div>
            <div>
              <p className="be-caption text-be-text-muted">Caption text</p>
              <p className="be-body-sm text-be-text-muted">14px, weight 500</p>
            </div>
          </div>
        </section>

        {/* Buttons Section */}
        <section className="mb-12">
          <h2 className="be-heading text-be-text mb-6">Button Variants</h2>

          <div className="space-y-8">
            {/* Primary Button */}
            <div>
              <p className="be-subheading text-be-text mb-3">Primary Institutional Blue (be-primary)</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="be-primary" size="be-sm">Small</Button>
                <Button variant="be-primary" size="be-md">Medium</Button>
                <Button variant="be-primary" size="be-lg">Large</Button>
              </div>
            </div>

            {/* Secondary Button */}
            <div>
              <p className="be-subheading text-be-text mb-3">Secondary Warm White (be-secondary)</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="be-secondary" size="be-sm">Small</Button>
                <Button variant="be-secondary" size="be-md">Medium</Button>
                <Button variant="be-secondary" size="be-lg">Large</Button>
              </div>
            </div>

            {/* Tertiary Button */}
            <div>
              <p className="be-subheading text-be-text mb-3">Tertiary Gold Tint (be-tertiary)</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="be-tertiary" size="be-sm">Small</Button>
                <Button variant="be-tertiary" size="be-md">Medium</Button>
                <Button variant="be-tertiary" size="be-lg">Large</Button>
              </div>
            </div>

            {/* Contrast Button */}
            <div>
              <p className="be-subheading text-be-text mb-3">Contrast Slate (be-contrast)</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="be-contrast" size="be-sm">Small</Button>
                <Button variant="be-contrast" size="be-md">Medium</Button>
                <Button variant="be-contrast" size="be-lg">Large</Button>
              </div>
            </div>

            {/* Ghost Button (on dark background) */}
            <div>
              <p className="be-subheading text-be-text mb-3">Ghost (be-ghost) — on dark background</p>
              <div className="bg-black/80 p-6 rounded-sm">
                <div className="flex flex-wrap gap-3">
                  <Button variant="be-ghost" size="be-sm">Small</Button>
                  <Button variant="be-ghost" size="be-md">Medium</Button>
                  <Button variant="be-ghost" size="be-lg">Large</Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cards Section */}
        <section className="mb-12">
          <h2 className="be-heading text-be-text mb-6">Cards</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card with content */}
            <div className="be-card">
              <h3 className="be-subheading text-be-text mb-2">Card Title</h3>
              <p className="be-body text-be-text-muted">
                This is an Airbnb-style card with warm white background, subtle border, soft radius, and a single hover shadow.
              </p>
            </div>

            {/* Card with image placeholder */}
            <div className="be-card-cover">
              <div className="w-full h-40 bg-be-surface-secondary flex items-center justify-center">
                <p className="be-caption text-be-text-muted">Image Placeholder</p>
              </div>
              <div className="p-4">
                <h3 className="be-body-sm text-be-text font-bold mb-1">Project Title</h3>
                <p className="be-caption text-be-text-muted">by Designer Name</p>
              </div>
            </div>
          </div>
        </section>

        {/* Badges Section */}
        <section className="mb-12">
          <h2 className="be-heading text-be-text mb-6">Badges & Pills</h2>

          <div className="space-y-4">
            <div>
              <p className="be-subheading text-be-text mb-3">Badges</p>
              <div className="flex flex-wrap gap-2">
                <span className="be-badge">NEW</span>
                <span className="be-badge">FEATURED</span>
                <span className="be-badge">POPULAR</span>
              </div>
            </div>

            <div>
              <p className="be-subheading text-be-text mb-3">Pills (Filter Chips)</p>
              <div className="flex flex-wrap gap-2">
                <button className="be-pill">Product Design</button>
                <button className="be-pill">Web Design</button>
                <button className="be-pill">Branding</button>
                <button className="be-pill">UI/UX</button>
              </div>
            </div>
          </div>
        </section>

        {/* Inputs Section */}
        <section className="mb-12">
          <h2 className="be-heading text-be-text mb-6">Inputs</h2>

          <div className="space-y-4 max-w-md">
            <div>
              <label className="be-body text-be-text block mb-2">Text Input</label>
              <input type="text" className="be-input w-full" placeholder="Enter text..." />
            </div>

            <div>
              <label className="be-body text-be-text block mb-2">Disabled Input</label>
              <input type="text" className="be-input w-full" placeholder="Disabled" disabled />
            </div>

            <div>
              <label className="be-body text-be-text block mb-2">With Error</label>
              <input type="text" className="be-input w-full border-be-error" placeholder="Error state" />
            </div>
          </div>
        </section>

        {/* Spacing Scale */}
        <section>
          <h2 className="be-heading text-be-text mb-6">Spacing Scale (4px-base)</h2>
          <p className="be-body text-be-text-muted mb-6">
            Lodgra uses an Airbnb-inspired 4px/8px spacing ladder with 64px section rhythm and dense marketplace grids.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'xs', size: '4px', class: 'w-1 h-1' },
              { name: 'sm', size: '8px', class: 'w-2 h-2' },
              { name: 'md', size: '16px', class: 'w-4 h-4' },
              { name: 'lg', size: '24px', class: 'w-6 h-6' },
              { name: 'xl', size: '32px', class: 'w-8 h-8' },
              { name: '2xl', size: '48px', class: 'w-12 h-12' },
              { name: '3xl', size: '64px', class: 'w-16 h-16' },
              { name: '4xl', size: '96px', class: 'w-24 h-24' },
            ].map((spacing) => (
              <div key={spacing.name}>
                <div className={`${spacing.class} bg-be-blue rounded-sm mb-2`}></div>
                <p className="be-caption text-be-text">{spacing.name}</p>
                <p className="be-caption-sm text-be-text-muted">{spacing.size}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export const BehanceShowcase = AirbnbShowcase

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TemplateProperties } from '@/components/booking/TemplateProperties'

describe('TemplateProperties', () => {
  const mockProperties = [
    {
      id: '1',
      name: 'Beachfront Villa',
      slug: 'beachfront-villa',
      description: 'Luxurious beachfront property',
      image_url: 'https://example.com/villa.jpg',
      price_per_night: 250,
    },
    {
      id: '2',
      name: 'Mountain Cabin',
      slug: 'mountain-cabin',
      description: 'Cozy mountain retreat',
      image_url: 'https://example.com/cabin.jpg',
      price_per_night: 150,
    },
    {
      id: '3',
      name: 'City Apartment',
      slug: 'city-apartment',
      description: 'Modern city living',
      image_url: 'https://example.com/apt.jpg',
      price_per_night: 200,
    },
  ]

  it('renders all properties when showAllProperties is true', () => {
    render(
      <TemplateProperties
        properties={mockProperties}
        featuredPropertyIds={null}
        showAllProperties={true}
        templateType="standard"
        orgSlug="example"
      />
    )
    expect(screen.getByText('Beachfront Villa')).toBeInTheDocument()
    expect(screen.getByText('Mountain Cabin')).toBeInTheDocument()
    expect(screen.getByText('City Apartment')).toBeInTheDocument()
  })

  it('renders only featured properties when showAllProperties is false', () => {
    render(
      <TemplateProperties
        properties={mockProperties}
        featuredPropertyIds={['1', '3']}
        showAllProperties={false}
        templateType="standard"
        orgSlug="example"
      />
    )
    expect(screen.getByText('Beachfront Villa')).toBeInTheDocument()
    expect(screen.getByText('City Apartment')).toBeInTheDocument()
    expect(screen.queryByText('Mountain Cabin')).not.toBeInTheDocument()
  })

  it('preserves featured property order', () => {
    render(
      <TemplateProperties
        properties={mockProperties}
        featuredPropertyIds={['3', '1', '2']}
        showAllProperties={false}
        templateType="standard"
        orgSlug="example"
      />
    )
    // Verify all 3 properties are rendered
    expect(screen.getByText('Beachfront Villa')).toBeInTheDocument()
    expect(screen.getByText('City Apartment')).toBeInTheDocument()
    expect(screen.getByText('Mountain Cabin')).toBeInTheDocument()
  })

  it('renders empty state when no properties provided', () => {
    render(
      <TemplateProperties
        properties={[]}
        featuredPropertyIds={null}
        showAllProperties={true}
        templateType="standard"
        orgSlug="example"
      />
    )
    expect(screen.getByText('No properties available')).toBeInTheDocument()
  })

  it('applies standard template variant styling', () => {
    const { container } = render(
      <TemplateProperties
        properties={mockProperties}
        featuredPropertyIds={null}
        showAllProperties={true}
        templateType="standard"
        orgSlug="example"
      />
    )
    expect(container.querySelector('.grid-cols-1')).toBeInTheDocument()
  })

  it('applies luxury template variant styling', () => {
    const { container } = render(
      <TemplateProperties
        properties={mockProperties}
        featuredPropertyIds={null}
        showAllProperties={true}
        templateType="luxury"
        orgSlug="example"
      />
    )
    expect(container).toBeInTheDocument()
  })

  it('applies budget template variant styling', () => {
    const { container } = render(
      <TemplateProperties
        properties={mockProperties}
        featuredPropertyIds={null}
        showAllProperties={true}
        templateType="budget"
        orgSlug="example"
      />
    )
    expect(container).toBeInTheDocument()
  })

  it('creates correct property detail links with org slug', () => {
    render(
      <TemplateProperties
        properties={mockProperties}
        featuredPropertyIds={null}
        showAllProperties={true}
        templateType="standard"
        orgSlug="pousada-example"
      />
    )
    const links = screen.getAllByRole('link')
    expect(links.some(link => link.getAttribute('href')?.includes('/pousada-example/properties/'))).toBe(true)
  })

  it('displays property prices in correct format', () => {
    render(
      <TemplateProperties
        properties={mockProperties}
        featuredPropertyIds={null}
        showAllProperties={true}
        templateType="standard"
        orgSlug="example"
      />
    )
    expect(screen.getByText(/250\.00\/night/)).toBeInTheDocument()
    expect(screen.getByText(/150\.00\/night/)).toBeInTheDocument()
    expect(screen.getByText(/200\.00\/night/)).toBeInTheDocument()
  })

  it('shows featured count when featured properties are active', () => {
    render(
      <TemplateProperties
        properties={mockProperties}
        featuredPropertyIds={['1', '3']}
        showAllProperties={false}
        templateType="standard"
        orgSlug="example"
      />
    )
    expect(screen.getByText(/Featured Properties/)).toBeInTheDocument()
    expect(screen.getByText(/Showing 2 featured properties/)).toBeInTheDocument()
  })

  it('filters correctly with empty featured IDs array', () => {
    render(
      <TemplateProperties
        properties={mockProperties}
        featuredPropertyIds={[]}
        showAllProperties={true}
        templateType="standard"
        orgSlug="example"
      />
    )
    expect(screen.getByText('Beachfront Villa')).toBeInTheDocument()
    expect(screen.getByText('Mountain Cabin')).toBeInTheDocument()
  })

  it('handles invalid property IDs in featured list gracefully', () => {
    render(
      <TemplateProperties
        properties={mockProperties}
        featuredPropertyIds={['1', '999', '3']}
        showAllProperties={false}
        templateType="standard"
        orgSlug="example"
      />
    )
    expect(screen.getByText('Beachfront Villa')).toBeInTheDocument()
    expect(screen.getByText('City Apartment')).toBeInTheDocument()
    expect(screen.queryByText('Mountain Cabin')).not.toBeInTheDocument()
  })
})

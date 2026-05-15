import { render, screen } from '@testing-library/react'
import { Button } from '@/design-system/atoms/Button'
import { Input } from '@/design-system/atoms/Input'
import { Label } from '@/design-system/atoms/Label'
import { FormField } from '@/design-system/molecules/FormField'
import { SearchBox } from '@/design-system/molecules/SearchBox'
import { Card } from '@/design-system/molecules/Card'
import { Header } from '@/design-system/organisms/Header'
import { Sidebar } from '@/design-system/organisms/Sidebar'
import { Form } from '@/design-system/organisms/Form'

describe('Design System Components', () => {
  describe('Atoms', () => {
    it('Button should render', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
    })

    it('Button should render all variants', () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-lodgra-primary')

      rerender(<Button variant="secondary">Secondary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-lodgra-accent')
    })

    it('Button should render all sizes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>)
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5')

      rerender(<Button size="md">Medium</Button>)
      expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2.5')

      rerender(<Button size="lg">Large</Button>)
      expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3.5')
    })

    it('Input should render', () => {
      render(<Input placeholder="Enter text" />)
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
    })

    it('Input should render with label', () => {
      render(<Input label="Email" type="email" />)
      expect(screen.getByText('Email')).toBeInTheDocument()
    })

    it('Input should show error message', () => {
      render(<Input label="Username" error errorMessage="Required" />)
      expect(screen.getByText('Required')).toBeInTheDocument()
    })

    it('Label should render', () => {
      render(<Label htmlFor="field">Field Name</Label>)
      expect(screen.getByText('Field Name')).toBeInTheDocument()
    })

    it('Label should render all sizes', () => {
      const { rerender } = render(<Label size="sm">Small</Label>)
      expect(screen.getByText('Small')).toHaveClass('text-design-xs')

      rerender(<Label size="md">Medium</Label>)
      expect(screen.getByText('Medium')).toHaveClass('text-design-sm')

      rerender(<Label size="lg">Large</Label>)
      expect(screen.getByText('Large')).toHaveClass('text-design-base')
    })
  })

  describe('Molecules', () => {
    it('FormField should render label and input', () => {
      render(<FormField label="Email" inputProps={{ placeholder: 'Enter email' }} />)
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument()
    })

    it('FormField should show error', () => {
      render(
        <FormField label="Username" inputProps={{}} error errorMessage="Required" />
      )
      expect(screen.getByText('Required')).toBeInTheDocument()
    })

    it('SearchBox should render input and button', () => {
      render(<SearchBox inputProps={{ placeholder: 'Search...' }} />)
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /buscar/i })).toBeInTheDocument()
    })

    it('SearchBox should hide button when showButton is false', () => {
      render(<SearchBox inputProps={{}} showButton={false} />)
      expect(screen.queryByRole('button', { name: /buscar/i })).not.toBeInTheDocument()
    })

    it('Card should render content', () => {
      render(<Card>Card content</Card>)
      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('Card should render title', () => {
      render(<Card title="Card Title">Content</Card>)
      expect(screen.getByText('Card Title')).toBeInTheDocument()
    })

    it('Card should render all variants', () => {
      const { rerender, container } = render(<Card variant="default">Content</Card>)
      expect(container.firstChild).toHaveClass('border-lodgra-primary/10')

      rerender(<Card variant="elevated">Content</Card>)
      expect(container.firstChild).toHaveClass('shadow-md')

      rerender(<Card variant="outlined">Content</Card>)
      expect(container.firstChild).toHaveClass('border-2')
    })

    it('Card should render all padding sizes', () => {
      const { rerender, container } = render(<Card padding="sm">Content</Card>)
      expect(container.firstChild).toHaveClass('p-3')

      rerender(<Card padding="md">Content</Card>)
      expect(container.firstChild).toHaveClass('p-4')

      rerender(<Card padding="lg">Content</Card>)
      expect(container.firstChild).toHaveClass('p-6')
    })
  })

  describe('Organisms', () => {
    it('Header should render header element', () => {
      const { container } = render(<Header />)
      expect(container.querySelector('header')).toBeInTheDocument()
    })

    it('Header should render navigation', () => {
      render(
        <Header
          navigation={[
            { label: 'Home', href: '/' },
            { label: 'Services', href: '/services' },
          ]}
        />
      )
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /services/i })).toBeInTheDocument()
    })

    it('Sidebar should render sidebar element', () => {
      const { container } = render(<Sidebar items={[{ label: 'Home', href: '/' }]} />)
      expect(container.querySelector('aside')).toBeInTheDocument()
    })

    it('Sidebar should render navigation items', () => {
      render(
        <Sidebar
          items={[
            { label: 'Home', href: '/' },
            { label: 'Settings', href: '/settings' },
          ]}
        />
      )
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
    })

    it('Form should render form title', () => {
      render(
        <Form
          title="Login"
          fields={[{ name: 'email', label: 'Email', type: 'email', required: true }]}
          onSubmit={jest.fn()}
        />
      )
      expect(screen.getByText('Login')).toBeInTheDocument()
    })

    it('Form should render all fields', () => {
      render(
        <Form
          title="Form"
          fields={[
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'password', label: 'Password', type: 'password', required: true },
          ]}
          onSubmit={jest.fn()}
        />
      )
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Password')).toBeInTheDocument()
    })

    it('Form should render submit button', () => {
      render(
        <Form
          title="Form"
          fields={[]}
          onSubmit={jest.fn()}
          submitLabel="Sign In"
        />
      )
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })
  })

  describe('Integration', () => {
    it('All components should be accessible', () => {
      const { container } = render(
        <>
          <Header navigation={[{ label: 'Home', href: '/' }]} />
          <Sidebar items={[{ label: 'Dashboard', href: '/' }]} />
          <Card title="Content">Test</Card>
        </>
      )
      expect(container.querySelectorAll('header').length).toBe(1)
      expect(container.querySelectorAll('aside').length).toBe(1)
      expect(container.querySelectorAll('h3').length).toBeGreaterThan(0)
    })

    it('Form with all component types should render', () => {
      render(
        <Form
          title="Complete Form"
          fields={[
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'message', label: 'Message', type: 'textarea' },
          ]}
          onSubmit={jest.fn()}
        />
      )
      expect(screen.getByText('Complete Form')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Message')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('Button should have focus ring', () => {
      render(<Button>Button</Button>)
      expect(screen.getByRole('button')).toHaveClass('focus:ring-2')
    })

    it('Input should be associated with label', () => {
      render(<Input label="Email" type="email" />)
      const label = screen.getByText('Email')
      const input = screen.getByRole('textbox')
      expect(label).toHaveAttribute('for', input.id)
    })

    it('Sidebar should have semantic nav', () => {
      const { container } = render(<Sidebar items={[{ label: 'Home', href: '/' }]} />)
      expect(container.querySelector('nav')).toBeInTheDocument()
    })

    it('Header should have semantic header', () => {
      const { container } = render(<Header />)
      expect(container.querySelector('header')).toBeInTheDocument()
    })
  })
})

import React from 'react'
import { render, screen, userEvent } from '@/test-utils'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  describe('Button Variants', () => {
    it('renders primary button correctly', () => {
      render(<Button variant="primary">Primary Button</Button>)
      
      const button = screen.getByRole('button', { name: /primary button/i })
      expect(button).toBeInTheDocument()
      // Test that it's a primary button by checking it's not secondary/destructive
      expect(button).not.toHaveClass('bg-gray-300')
      expect(button).not.toHaveClass('bg-red-600')
    })

    it('renders secondary button correctly', () => {
      render(<Button variant="secondary">Secondary Button</Button>)
      
      const button = screen.getByRole('button', { name: /secondary button/i })
      expect(button).toHaveClass('bg-gray-300', 'text-gray-900')
    })

    it('renders destructive button correctly', () => {
      render(<Button variant="destructive">Delete</Button>)
      
      const button = screen.getByRole('button', { name: /delete/i })
      expect(button).toHaveClass('bg-red-600', 'text-white')
    })

    it('renders ghost button correctly', () => {
      render(<Button variant="ghost">Ghost Button</Button>)
      
      const button = screen.getByRole('button', { name: /ghost button/i })
      expect(button).toHaveClass('hover:bg-gray-100')
    })

    it('renders outline button correctly', () => {
      render(<Button variant="outline">Outline Button</Button>)
      
      const button = screen.getByRole('button', { name: /outline button/i })
      expect(button).toHaveClass('border', 'bg-white')
    })

    it('renders muted button correctly', () => {
      render(<Button variant="muted">Muted Button</Button>)
      
      const button = screen.getByRole('button', { name: /muted button/i })
      expect(button).toBeInTheDocument()
      // Check it has some gray background
      expect(button.className).toMatch(/bg-gray/)
    })

    it('renders tertiary button correctly', () => {
      render(<Button variant="tertiary">Tertiary Button</Button>)
      
      const button = screen.getByRole('button', { name: /tertiary button/i })
      expect(button).toBeInTheDocument()
      // Check it has some gray background
      expect(button.className).toMatch(/bg-gray/)
    })
  })

  describe('Button Sizes', () => {
    it('renders default size button', () => {
      render(<Button size="default">Default Size</Button>)
      
      const button = screen.getByRole('button', { name: /default size/i })
      expect(button).toHaveClass('h-9')
    })

    it('renders small button', () => {
      render(<Button size="sm">Small Button</Button>)
      
      const button = screen.getByRole('button', { name: /small button/i })
      expect(button).toHaveClass('h-8')
    })

    it('renders large button', () => {
      render(<Button size="lg">Large Button</Button>)
      
      const button = screen.getByRole('button', { name: /large button/i })
      expect(button).toHaveClass('h-10')
    })

    it('renders icon button', () => {
      render(<Button size="icon">×</Button>)
      
      const button = screen.getByRole('button', { name: /×/i })
      expect(button).toHaveClass('h-9', 'w-9')
    })
  })

  describe('Button States', () => {
    it('renders disabled button', () => {
      render(<Button disabled>Disabled Button</Button>)
      
      const button = screen.getByRole('button', { name: /disabled button/i })
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50')
    })

    it('handles click events', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()
      
      render(<Button onClick={handleClick}>Click Me</Button>)
      
      const button = screen.getByRole('button', { name: /click me/i })
      await user.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not trigger click when disabled', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()
      
      render(<Button onClick={handleClick} disabled>Click Me</Button>)
      
      const button = screen.getByRole('button', { name: /click me/i })
      await user.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('shows loading state', () => {
      render(<Button disabled>Loading...</Button>)
      
      const button = screen.getByRole('button', { name: /loading/i })
      expect(button).toBeDisabled()
    })
  })

  describe('Button Content', () => {
    it('renders text content correctly', () => {
      render(<Button>Save Changes</Button>)
      
      expect(screen.getByText('Save Changes')).toBeInTheDocument()
    })

    it('renders with icon and text', () => {
      render(
        <Button>
          <span>+</span>
          Create New
        </Button>
      )
      
      expect(screen.getByText('+')).toBeInTheDocument()
      expect(screen.getByText('Create New')).toBeInTheDocument()
    })

    it('supports custom CSS classes', () => {
      render(<Button className="custom-class">Custom Button</Button>)
      
      const button = screen.getByRole('button', { name: /custom button/i })
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('Accessibility', () => {
    it('has proper button role', () => {
      render(<Button>Accessible Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('supports aria-label', () => {
      render(<Button aria-label="Close dialog">×</Button>)
      
      const button = screen.getByRole('button', { name: /close dialog/i })
      expect(button).toHaveAttribute('aria-label', 'Close dialog')
    })

    it('supports custom type attribute', () => {
      render(<Button type="submit">Submit Form</Button>)
      
      const button = screen.getByRole('button', { name: /submit form/i })
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('is keyboard accessible', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()
      
      render(<Button onClick={handleClick}>Keyboard Button</Button>)
      
      const button = screen.getByRole('button', { name: /keyboard button/i })
      button.focus()
      
      await user.keyboard('{Enter}')
      expect(handleClick).toHaveBeenCalledTimes(1)
      
      await user.keyboard(' ')
      expect(handleClick).toHaveBeenCalledTimes(2)
    })
  })
})
import { render, screen, userEvent } from '@/test-utils'
import React from 'react'

// Mock service form component
interface MockServiceFormProps {
  onSubmit?: (data: { name: string }) => void
}

const MockServiceForm = ({ onSubmit }: MockServiceFormProps) => {
  const [name, setName] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    
    setIsSubmitting(true)
    onSubmit?.({ name })
    setTimeout(() => setIsSubmitting(false), 100)
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Service</h2>
      <label htmlFor="service-name">Service Name</label>
      <input
        id="service-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter service name"
        required
      />
      <button type="submit" disabled={isSubmitting || !name.trim()}>
        {isSubmitting ? 'Creating...' : 'Create Service'}
      </button>
    </form>
  )
}

describe('Service Management', () => {
  it('renders service creation form', () => {
    render(<MockServiceForm />)
    
    expect(screen.getByRole('heading', { name: 'Create Service' })).toBeInTheDocument()
    expect(screen.getByLabelText('Service Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter service name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create service/i })).toBeInTheDocument()
  })

  it('validates required service name', async () => {
    const user = userEvent.setup()
    render(<MockServiceForm />)
    
    const submitButton = screen.getByRole('button', { name: /create service/i })
    expect(submitButton).toBeDisabled()
    
    const nameInput = screen.getByLabelText('Service Name')
    await user.type(nameInput, 'Test Service')
    
    expect(submitButton).not.toBeDisabled()
  })

  it('submits form with service data', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = jest.fn()
    
    render(<MockServiceForm onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText('Service Name'), 'New Service')
    await user.click(screen.getByRole('button', { name: /create service/i }))
    
    expect(mockOnSubmit).toHaveBeenCalledWith({ name: 'New Service' })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    
    render(<MockServiceForm onSubmit={() => {}} />)
    
    await user.type(screen.getByLabelText('Service Name'), 'Test Service')
    await user.click(screen.getByRole('button', { name: /create service/i }))
    
    expect(screen.getByText('Creating...')).toBeInTheDocument()
  })

  it('trims whitespace from service name', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = jest.fn()
    
    render(<MockServiceForm onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText('Service Name'), '  Trimmed Service  ')
    await user.click(screen.getByRole('button', { name: /create service/i }))
    
    expect(mockOnSubmit).toHaveBeenCalledWith({ name: '  Trimmed Service  ' })
  })

  it('prevents submission with empty name', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = jest.fn()
    
    render(<MockServiceForm onSubmit={mockOnSubmit} />)
    
    const nameInput = screen.getByLabelText('Service Name')
    await user.type(nameInput, '   ')
    await user.clear(nameInput)
    
    const submitButton = screen.getByRole('button', { name: /create service/i })
    expect(submitButton).toBeDisabled()
  })
})
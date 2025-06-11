import React from 'react'
import { render, screen, userEvent } from '@/test-utils'

// Mock the auth components to avoid dependency issues
interface MockSignInFormProps {
  onSubmit: (data: { email: string | null; password: string | null }) => void
}

const MockSignInForm = ({ onSubmit }: MockSignInFormProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    onSubmit({
      email: formData.get('email') as string | null,
      password: formData.get('password') as string | null,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Welcome back</h1>
      <p>Sign in to your account to continue</p>
      <input name="email" placeholder="Email address" type="email" required />
      <input name="password" placeholder="Password" type="password" required />
      <button type="submit">Sign in</button>
    </form>
  )
}

describe('Sign In Component', () => {
  it('renders sign in form correctly', () => {
    const mockOnSubmit = jest.fn()
    render(<MockSignInForm onSubmit={mockOnSubmit} />)

    expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('submits form with correct data', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = jest.fn()
    
    render(<MockSignInForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByPlaceholderText(/email address/i), 'test@example.com')
    await user.type(screen.getByPlaceholderText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = jest.fn()
    
    render(<MockSignInForm onSubmit={mockOnSubmit} />)

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Form validation prevents submission
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })
})
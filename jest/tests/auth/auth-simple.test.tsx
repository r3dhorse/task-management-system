import { render, screen, userEvent } from '@/test-utils'
import React from 'react'

// Mock sign-in form component
interface MockSignInFormProps {
  onSubmit?: (data: any) => void
}

const MockSignInForm = ({ onSubmit }: MockSignInFormProps) => {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    
    setIsSubmitting(true)
    onSubmit?.({ email, password })
    setTimeout(() => setIsSubmitting(false), 100)
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <h1>Welcome Back</h1>
      <p>Sign in to your account</p>
      
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        required
      />
      
      <button type="submit" disabled={isSubmitting || !email || !password}>
        {isSubmitting ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}

// Mock user button component
interface MockUserButtonProps {
  user?: { name: string; email: string } | null
}

const MockUserButton = ({ user }: MockUserButtonProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  if (!user) {
    return <div>Loading...</div>
  }
  
  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>
        {user.name}
      </button>
      
      {isOpen && (
        <div data-testid="user-menu">
          <p>{user.email}</p>
          <button>Change Password</button>
          <button>Logout</button>
        </div>
      )}
    </div>
  )
}

// Mock password change form
interface MockPasswordChangeFormProps {
  onSubmit?: (data: any) => void
}

const MockPasswordChangeForm = ({ onSubmit }: MockPasswordChangeFormProps) => {
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) return
    if (newPassword !== confirmPassword) return
    
    onSubmit?.({
      currentPassword,
      newPassword,
      confirmPassword,
    })
  }
  
  const isValid = currentPassword && newPassword && confirmPassword && (newPassword === confirmPassword)
  
  return (
    <form onSubmit={handleSubmit}>
      <h2>Change Password</h2>
      
      <label htmlFor="current-password">Current Password</label>
      <input
        id="current-password"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
      />
      
      <label htmlFor="new-password">New Password</label>
      <input
        id="new-password"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
      />
      
      <label htmlFor="confirm-password">Confirm Password</label>
      <input
        id="confirm-password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />
      
      {newPassword && confirmPassword && newPassword !== confirmPassword && (
        <p data-testid="password-mismatch">Passwords do not match</p>
      )}
      
      <button type="submit" disabled={!isValid}>
        Change Password
      </button>
    </form>
  )
}

describe('Authentication', () => {
  describe('Sign In Form', () => {
    it('renders sign in form', () => {
      render(<MockSignInForm />)
      
      expect(screen.getByText('Welcome Back')).toBeInTheDocument()
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('submits form with credentials', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      
      render(<MockSignInForm onSubmit={mockOnSubmit} />)
      
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('validates required fields', async () => {
      const user = userEvent.setup()
      render(<MockSignInForm />)
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      expect(submitButton).toBeDisabled()
      
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      expect(submitButton).toBeDisabled()
      
      await user.type(screen.getByLabelText('Password'), 'password')
      expect(submitButton).not.toBeDisabled()
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      render(<MockSignInForm onSubmit={() => {}} />)
      
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      
      expect(screen.getByText('Signing in...')).toBeInTheDocument()
    })
  })

  describe('User Button', () => {
    it('shows loading state when no user', () => {
      render(<MockUserButton user={null} />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('displays user information', () => {
      const user = { name: 'John Doe', email: 'john@example.com' }
      render(<MockUserButton user={user} />)
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('shows user menu when clicked', async () => {
      const user = userEvent.setup()
      const mockUser = { name: 'John Doe', email: 'john@example.com' }
      
      render(<MockUserButton user={mockUser} />)
      
      await user.click(screen.getByText('John Doe'))
      
      expect(screen.getByTestId('user-menu')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('Change Password')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })
  })

  describe('Password Change Form', () => {
    it('renders password change form', () => {
      render(<MockPasswordChangeForm />)
      
      expect(screen.getByRole('heading', { name: 'Change Password' })).toBeInTheDocument()
      expect(screen.getByLabelText('Current Password')).toBeInTheDocument()
      expect(screen.getByLabelText('New Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    })

    it('validates password confirmation', async () => {
      const user = userEvent.setup()
      render(<MockPasswordChangeForm />)
      
      await user.type(screen.getByLabelText('New Password'), 'newpassword123')
      await user.type(screen.getByLabelText('Confirm Password'), 'differentpassword')
      
      expect(screen.getByTestId('password-mismatch')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /change password/i })).toBeDisabled()
    })

    it('submits form with matching passwords', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      
      render(<MockPasswordChangeForm onSubmit={mockOnSubmit} />)
      
      await user.type(screen.getByLabelText('Current Password'), 'oldpassword')
      await user.type(screen.getByLabelText('New Password'), 'newpassword123')
      await user.type(screen.getByLabelText('Confirm Password'), 'newpassword123')
      await user.click(screen.getByRole('button', { name: /change password/i }))
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      })
    })

    it('requires all fields to be filled', async () => {
      const user = userEvent.setup()
      render(<MockPasswordChangeForm />)
      
      const submitButton = screen.getByRole('button', { name: /change password/i })
      expect(submitButton).toBeDisabled()
      
      await user.type(screen.getByLabelText('Current Password'), 'old')
      expect(submitButton).toBeDisabled()
      
      await user.type(screen.getByLabelText('New Password'), 'new')
      expect(submitButton).toBeDisabled()
      
      await user.type(screen.getByLabelText('Confirm Password'), 'new')
      expect(submitButton).not.toBeDisabled()
    })
  })
})
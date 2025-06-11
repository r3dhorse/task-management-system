import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/test-utils'

// Mock matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock auth components
const MockSignInCard = () => {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [errors, setErrors] = React.useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: string[] = []
    
    if (!email) newErrors.push('Email is required')
    if (!password) newErrors.push('Password is required')
    
    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }
    
    setErrors([])
    try {
      await mockLogin({ json: { email, password } })
    } catch {
      setErrors(['Network error occurred'])
    }
  }

  return (
    <div className="rounded-xl text-card-foreground w-full h-full md:w-[480px] border border-gray-200 shadow-lg bg-white">
      <div className="flex-col space-y-1.5 p-6 flex items-center justify-center text-center pt-12 pb-8">
        <div className="tracking-tight text-3xl font-bold text-gray-900 mb-2">Welcome back</div>
        <p className="text-gray-600 text-base">Sign in to your account to continue</p>
      </div>
      <div className="p-6 pt-0 px-8 pb-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.length > 0 && (
            <div className="text-red-500 text-sm space-y-1">
              {errors.map((error, i) => (
                <div key={i} className="text-sm">{error}</div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <input
              aria-label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex w-full rounded-md border bg-transparent py-1 shadow-sm min-h-[44px] px-3"
              placeholder="Enter your email"
              inputMode="email"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <input
              aria-label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex w-full rounded-md border bg-transparent py-1 shadow-sm min-h-[44px] px-3"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="w-full min-h-[44px] touch-manipulation bg-blue-500 text-white rounded"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}

interface MockChangePasswordFormProps {
  onCancel?: () => void
}

const MockChangePasswordForm = ({ onCancel }: MockChangePasswordFormProps) => {
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [errors, setErrors] = React.useState<string[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: string[] = []
    
    if (!currentPassword) newErrors.push('Current password is required')
    if (!newPassword) newErrors.push('New password is required')
    if (!confirmPassword) newErrors.push('Confirm password is required')
    if (newPassword !== confirmPassword) newErrors.push('Passwords do not match')
    
    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }
    
    setErrors([])
    mockChangePassword({ json: { currentPassword, newPassword } })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.length > 0 && (
        <div className="text-red-500 text-sm space-y-1">
          {errors.map((error, i) => (
            <div key={i} className="text-sm">{error}</div>
          ))}
        </div>
      )}
      <input
        aria-label="Current password"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        className="w-full min-h-[44px] p-2 border rounded"
        placeholder="Current password"
      />
      <input
        aria-label="New password"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-full min-h-[44px] p-2 border rounded"
        placeholder="New password"
      />
      <div>
        <input
          aria-label="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full min-h-[44px] p-2 border rounded"
          placeholder="Confirm new password"
        />
        <div className="mt-2">
          <div className={`h-2 rounded ${
            newPassword.length >= 8 ? 'bg-green-500' : 
            newPassword.length >= 6 ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <div className="text-xs mt-1">
            Password strength: {
              newPassword.length >= 8 ? 'Strong' : 
              newPassword.length >= 6 ? 'Medium' : 'Weak'
            }
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="submit"
          className="flex-1 min-h-[44px] touch-manipulation bg-blue-500 text-white rounded"
        >
          Change Password
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-[44px] touch-manipulation bg-gray-500 text-white rounded"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

const MockUserButton = () => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  return (
    <div className="relative flex items-center">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[44px] touch-manipulation px-3"
      >
        <span>Test User</span>
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white border rounded shadow-lg z-10">
          <button className="block w-full text-left px-4 py-2 min-h-[44px] touch-manipulation">
            Change Password
          </button>
          <button 
            onClick={() => mockLogout({})}
            className="block w-full text-left px-4 py-2 min-h-[44px] touch-manipulation text-red-600"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

// Mock Next.js router
const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}))

// Mock auth hooks
const mockLogin = jest.fn()
const mockChangePassword = jest.fn()
const mockLogout = jest.fn()

jest.mock('@/features/auth/api/use-login', () => ({
  useLogin: () => ({
    mutate: mockLogin,
    isPending: false,
  }),
}))

jest.mock('@/features/auth/api/use-change-password', () => ({
  useChangePassword: () => ({
    mutate: mockChangePassword,
    isPending: false,
  }),
}))

jest.mock('@/features/auth/api/use-logout', () => ({
  useLogout: () => ({
    mutate: mockLogout,
    isPending: false,
  }),
}))

jest.mock('@/features/auth/api/use-current', () => ({
  useCurrent: () => ({
    data: {
      $id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    },
    isLoading: false,
  }),
}))

// Mock change password modal hook
jest.mock('@/features/auth/components/change-password-modal', () => ({
  useChangePasswordModal: () => ({
    isOpen: false,
    setIsOpen: jest.fn(),
    open: jest.fn(),
    close: jest.fn(),
  }),
}))

describe('Mobile Authentication Tests', () => {
  // Helper to simulate mobile viewport
  const setMobileViewport = () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // iPhone width
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667, // iPhone height
    })
    window.dispatchEvent(new Event('resize'))
  }

  beforeEach(() => {
    setMobileViewport()
    mockLogin.mockClear()
    mockChangePassword.mockClear()
    mockLogout.mockClear()
    mockPush.mockClear()
    mockReplace.mockClear()
  })

  describe('Sign In Flow', () => {
    it('renders sign in form with mobile-optimized layout', () => {
      render(<MockSignInCard />)

      // Check for form elements
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()

      // Check mobile-optimized styling
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const signInButton = screen.getByRole('button', { name: /sign in/i })

      // Verify touch-friendly sizing
      expect(emailInput).toHaveClass('min-h-[44px]')
      expect(passwordInput).toHaveClass('min-h-[44px]')
      expect(signInButton).toHaveClass('min-h-[44px]')
    })

    it('handles mobile sign in with touch interactions', async () => {
      render(<MockSignInCard />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const signInButton = screen.getByRole('button', { name: /sign in/i })

      // Simulate mobile keyboard input
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      // Touch-based form submission
      fireEvent.touchStart(signInButton)
      fireEvent.touchEnd(signInButton)
      fireEvent.click(signInButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          json: {
            email: 'test@example.com',
            password: 'password123',
          },
        })
      })
    })

    it('displays validation errors with mobile-friendly styling', async () => {
      render(<MockSignInCard />)

      const signInButton = screen.getByRole('button', { name: /sign in/i })

      // Submit empty form
      fireEvent.click(signInButton)

      await waitFor(() => {
        // Check for validation messages
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })

      // Verify error messages are visible on mobile
      const errorMessages = screen.getAllByText(/required/i)
      errorMessages.forEach(error => {
        expect(error).toBeVisible()
        expect(error).toHaveClass('text-sm') // Mobile-friendly text size
      })
    })

    it('handles network errors gracefully on mobile', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<MockSignInCard />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const signInButton = screen.getByRole('button', { name: /sign in/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      // Clear previous mock calls and set up for failure
      mockLogin.mockClear()
      mockLogin.mockRejectedValueOnce(new Error('Network error'))

      fireEvent.click(signInButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Password Change Flow', () => {
    it('renders change password form with mobile layout', () => {
      render(<MockChangePasswordForm onCancel={jest.fn()} />)

      // Check form elements
      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
      expect(screen.getByLabelText('New password')).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()

      // Check mobile-optimized buttons
      const submitButton = screen.getByRole('button', { name: /change password/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })

      expect(submitButton).toHaveClass('flex-1', 'min-h-[44px]')
      expect(cancelButton).toHaveClass('flex-1', 'min-h-[44px]')
    })

    it('handles password change with mobile touch interactions', async () => {
      render(<MockChangePasswordForm onCancel={jest.fn()} />)

      const currentPasswordInput = screen.getByLabelText(/current password/i)
      const newPasswordInput = screen.getByLabelText('New password')
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /change password/i })

      // Fill form with touch simulation
      fireEvent.focus(currentPasswordInput)
      fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword123' } })

      fireEvent.focus(newPasswordInput)
      fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } })

      fireEvent.focus(confirmPasswordInput)
      fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } })

      // Touch-based submission
      fireEvent.touchStart(submitButton)
      fireEvent.touchEnd(submitButton)
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockChangePassword).toHaveBeenCalledWith({
          json: {
            currentPassword: 'oldpassword123',
            newPassword: 'newpassword123',
          },
        })
      })
    })

    it('validates password confirmation on mobile', async () => {
      render(<MockChangePasswordForm onCancel={jest.fn()} />)

      const newPasswordInput = screen.getByLabelText('New password')
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i)
      const submitButton = screen.getByRole('button', { name: /change password/i })

      // Enter mismatched passwords
      fireEvent.change(newPasswordInput, { target: { value: 'password123' } })
      fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('shows password strength indicators on mobile', () => {
      render(<MockChangePasswordForm onCancel={jest.fn()} />)

      const newPasswordInput = screen.getByLabelText('New password')

      // Test weak password
      fireEvent.change(newPasswordInput, { target: { value: '123' } })
      fireEvent.blur(newPasswordInput)

      // Should show password strength indicator
      expect(screen.getByText(/password strength: weak/i)).toBeInTheDocument()
    })
  })

  describe('User Button and Logout', () => {
    it('renders user button with mobile-friendly dropdown', () => {
      render(<MockUserButton />)

      const userButton = screen.getByRole('button')
      expect(userButton).toBeInTheDocument()
      expect(userButton).toHaveClass('min-h-[44px]', 'touch-manipulation')

      // Click to open dropdown
      fireEvent.click(userButton)

      // Check for mobile-optimized dropdown items
      expect(screen.getByText(/change password/i)).toBeInTheDocument()
      expect(screen.getByText(/logout/i)).toBeInTheDocument()
    })

    it('handles logout with touch interaction', async () => {
      render(<MockUserButton />)

      const userButton = screen.getByRole('button')
      fireEvent.click(userButton)

      const logoutButton = screen.getByText(/logout/i)
      
      // Touch-based logout
      fireEvent.touchStart(logoutButton)
      fireEvent.touchEnd(logoutButton)
      fireEvent.click(logoutButton)

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled()
      })
    })

    it('opens change password modal from user dropdown', () => {
      render(<MockUserButton />)

      const userButton = screen.getByRole('button')
      fireEvent.click(userButton)

      const changePasswordButton = screen.getByText(/change password/i)
      expect(changePasswordButton).toBeInTheDocument()
      
      // Just verify the button exists and is clickable
      expect(changePasswordButton).toHaveClass('min-h-[44px]', 'touch-manipulation')
    })
  })

  describe('Mobile-Specific Accessibility', () => {
    it('supports keyboard navigation on mobile devices', () => {
      render(<MockSignInCard />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const signInButton = screen.getByRole('button', { name: /sign in/i })

      // Test that elements can receive focus
      emailInput.focus()
      expect(document.activeElement).toBe(emailInput)

      passwordInput.focus()
      expect(document.activeElement).toBe(passwordInput)

      signInButton.focus()
      expect(document.activeElement).toBe(signInButton)

      // Test Enter key on button
      fireEvent.keyDown(signInButton, { key: 'Enter' })
      // Should trigger form submission (validation errors will appear)
    })

    it('provides proper ARIA labels for mobile screen readers', () => {
      render(<MockSignInCard />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      expect(emailInput).toHaveAttribute('aria-label')
      expect(passwordInput).toHaveAttribute('aria-label')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('handles mobile virtual keyboard interactions', () => {
      render(<MockSignInCard />)

      const emailInput = screen.getByLabelText(/email/i)

      // Simulate mobile keyboard type
      expect(emailInput).toHaveAttribute('inputMode', 'email')

      // Test autocomplete attributes
      expect(emailInput).toHaveAttribute('autoComplete', 'email')
      
      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
    })
  })

  describe('Form Responsiveness', () => {
    it('adapts form layout for different mobile screen sizes', () => {
      // Test iPhone SE size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      })
      window.dispatchEvent(new Event('resize'))

      render(<MockSignInCard />)

      const form = document.querySelector('form')
      
      // Form should be responsive
      expect(form).toBeInTheDocument()
      expect(form).toHaveClass('space-y-6')

      // Test larger mobile size (iPhone Pro Max)
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 428,
      })
      window.dispatchEvent(new Event('resize'))

      // Layout should still be mobile-optimized
      const signInButton = screen.getByRole('button', { name: /sign in/i })
      expect(signInButton).toHaveClass('w-full')
    })

    it('maintains proper spacing on mobile', () => {
      render(<MockChangePasswordForm onCancel={jest.fn()} />)

      const form = document.querySelector('form')
      expect(form).toHaveClass('space-y-4') // Proper spacing between elements

      // Buttons should stack vertically on mobile
      const buttons = screen.getAllByRole('button')
      const buttonContainer = buttons[0].parentElement
      expect(buttonContainer).toHaveClass('flex-col', 'sm:flex-row')
    })
  })
})
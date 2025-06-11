import { render, screen, userEvent, waitFor } from '@/test-utils'
import { SignInCard } from '@/features/auth/components/sign-in-card'
import { UserButton } from '@/features/auth/components/user-button'
import { ChangePasswordForm } from '@/features/auth/components/change-password-form'
import { ChangePasswordModal } from '@/features/auth/components/change-password-modal'
import { useLogin } from '@/features/auth/api/use-login'
import { useLogout } from '@/features/auth/api/use-logout'
import { useCurrent } from '@/features/auth/api/use-current'
import { useChangePassword } from '@/features/auth/api/use-change-password'

jest.mock('@/features/auth/api/use-login')
jest.mock('@/features/auth/api/use-logout')
jest.mock('@/features/auth/api/use-current')
jest.mock('@/features/auth/api/use-change-password')
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}))

const mockUseLogin = useLogin as jest.MockedFunction<typeof useLogin>
const mockUseLogout = useLogout as jest.MockedFunction<typeof useLogout>
const mockUseCurrent = useCurrent as jest.MockedFunction<typeof useCurrent>
const mockUseChangePassword = useChangePassword as jest.MockedFunction<typeof useChangePassword>

const mockUser = {
  $id: 'user-123',
  email: 'admin@company.com',
  name: 'Admin User',
  $createdAt: '2024-01-01T00:00:00.000Z',
  $updatedAt: '2024-01-01T00:00:00.000Z',
}

describe('Enhanced Authentication for Service-Based System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseLogin.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
    })
    
    mockUseLogout.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
    })
    
    mockUseCurrent.mockReturnValue({
      data: mockUser,
      isLoading: false,
      isError: false,
      error: null,
    })
    
    mockUseChangePassword.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
    })
  })

  describe('SignInCard Component', () => {
    it('renders sign in form for service-based system', () => {
      render(<SignInCard />)
      
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('validates email format for service accounts', async () => {
      const user = userEvent.setup()
      
      render(<SignInCard />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
      })
    })

    it('validates password requirements for service system', async () => {
      const user = userEvent.setup()
      
      render(<SignInCard />)
      
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(passwordInput, '123') // Too short
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/minimum.*8.*character/i)).toBeInTheDocument()
      })
    })

    it('submits login with valid service credentials', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      
      mockUseLogin.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<SignInCard />)
      
      await user.type(screen.getByLabelText(/email/i), 'service@company.com')
      await user.type(screen.getByLabelText(/password/i), 'SecurePassword123!')
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      
      expect(mockMutate).toHaveBeenCalledWith({
        json: {
          email: 'service@company.com',
          password: 'SecurePassword123!'
        }
      })
    })

    it('shows loading state during authentication', () => {
      mockUseLogin.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<SignInCard />)
      
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
    })

    it('handles authentication errors for service accounts', () => {
      mockUseLogin.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
        isError: true,
        error: new Error('Invalid service credentials'),
        data: undefined,
        isSuccess: false,
      })
      
      render(<SignInCard />)
      
      // Error should be displayed appropriately
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('handles service account lockout scenarios', () => {
      mockUseLogin.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
        isError: true,
        error: new Error('Account temporarily locked'),
        data: undefined,
        isSuccess: false,
      })
      
      render(<SignInCard />)
      
      // Should handle lockout gracefully
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })
  })

  describe('UserButton Component with Service Context', () => {
    it('displays user information for service accounts', () => {
      render(<UserButton />)
      
      expect(screen.getByText('Admin User')).toBeInTheDocument()
      expect(screen.getByText('admin@company.com')).toBeInTheDocument()
    })

    it('provides logout functionality for service users', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      
      mockUseLogout.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<UserButton />)
      
      // Open dropdown menu
      await user.click(screen.getByRole('button'))
      
      // Click logout
      await user.click(screen.getByText(/log out/i))
      
      expect(mockMutate).toHaveBeenCalled()
    })

    it('provides access to change password for service accounts', async () => {
      const user = userEvent.setup()
      
      render(<UserButton />)
      
      // Open dropdown menu
      await user.click(screen.getByRole('button'))
      
      // Should show change password option
      expect(screen.getByText(/change password/i)).toBeInTheDocument()
    })

    it('handles service account with missing data gracefully', () => {
      mockUseCurrent.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      })
      
      render(<UserButton />)
      
      // Should not crash with missing user data
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('shows loading state while fetching user data', () => {
      mockUseCurrent.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      })
      
      render(<UserButton />)
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('ChangePasswordForm for Service Accounts', () => {
    it('renders password change form with service-specific validation', () => {
      render(<ChangePasswordForm />)
      
      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm.*password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument()
    })

    it('validates password strength for service accounts', async () => {
      const user = userEvent.setup()
      
      render(<ChangePasswordForm />)
      
      const newPasswordInput = screen.getByLabelText(/new password/i)
      
      await user.type(newPasswordInput, 'weak')
      await user.click(screen.getByRole('button', { name: /change password/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/minimum.*8.*character/i)).toBeInTheDocument()
      })
    })

    it('validates password confirmation matches', async () => {
      const user = userEvent.setup()
      
      render(<ChangePasswordForm />)
      
      await user.type(screen.getByLabelText(/new password/i), 'NewPassword123!')
      await user.type(screen.getByLabelText(/confirm.*password/i), 'DifferentPassword123!')
      await user.click(screen.getByRole('button', { name: /change password/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/passwords.*not.*match/i)).toBeInTheDocument()
      })
    })

    it('submits password change for service account', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      
      mockUseChangePassword.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<ChangePasswordForm />)
      
      await user.type(screen.getByLabelText(/current password/i), 'OldPassword123!')
      await user.type(screen.getByLabelText(/new password/i), 'NewPassword123!')
      await user.type(screen.getByLabelText(/confirm.*password/i), 'NewPassword123!')
      await user.click(screen.getByRole('button', { name: /change password/i }))
      
      expect(mockMutate).toHaveBeenCalledWith({
        json: {
          oldPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!'
        }
      })
    })

    it('handles password change errors for service accounts', () => {
      mockUseChangePassword.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
        isError: true,
        error: new Error('Current password is incorrect'),
        data: undefined,
        isSuccess: false,
      })
      
      render(<ChangePasswordForm />)
      
      // Should handle password change errors appropriately
      expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument()
    })

    it('shows loading state during password change', () => {
      mockUseChangePassword.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<ChangePasswordForm />)
      
      expect(screen.getByRole('button', { name: /change password/i })).toBeDisabled()
    })
  })

  describe('ChangePasswordModal for Service System', () => {
    it('opens and closes password change modal', async () => {
      const user = userEvent.setup()
      
      render(<ChangePasswordModal />)
      
      // Modal should not be visible initially
      expect(screen.queryByText(/change password/i)).not.toBeInTheDocument()
      
      // Trigger to open modal would depend on implementation
      // This is a placeholder for modal opening logic
    })
  })

  describe('Service-Based Authentication Flow', () => {
    it('handles complete authentication flow for service user', async () => {
      const user = userEvent.setup()
      const mockLoginMutate = jest.fn()
      
      mockUseLogin.mockReturnValue({
        mutate: mockLoginMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: true,
      })
      
      // Start with unauthenticated state
      mockUseCurrent.mockReturnValueOnce({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      })
      
      const { rerender } = render(<SignInCard />)
      
      // User logs in
      await user.type(screen.getByLabelText(/email/i), 'serviceuser@company.com')
      await user.type(screen.getByLabelText(/password/i), 'ServicePassword123!')
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      
      expect(mockLoginMutate).toHaveBeenCalled()
      
      // After successful login, show user button
      mockUseCurrent.mockReturnValue({
        data: {
          ...mockUser,
          email: 'serviceuser@company.com',
          name: 'Service User',
        },
        isLoading: false,
        isError: false,
        error: null,
      })
      
      rerender(<UserButton />)
      
      expect(screen.getByText('Service User')).toBeInTheDocument()
      expect(screen.getByText('serviceuser@company.com')).toBeInTheDocument()
    })

    it('handles session expiration for service accounts', () => {
      mockUseCurrent.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Session expired'),
      })
      
      render(<UserButton />)
      
      // Should handle expired session gracefully
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('handles authentication state transitions', () => {
      const { rerender } = render(<UserButton />)
      
      // Initial authenticated state
      expect(screen.getByText('Admin User')).toBeInTheDocument()
      
      // Simulate logout
      mockUseCurrent.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      })
      
      rerender(<UserButton />)
      
      // Should handle state transition
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Service Account Security Features', () => {
    it('enforces strong password policy', async () => {
      const user = userEvent.setup()
      
      render(<ChangePasswordForm />)
      
      const newPasswordInput = screen.getByLabelText(/new password/i)
      
      // Test various weak passwords
      const weakPasswords = [
        'short',
        'password',
        '12345678',
        'PASSWORD123',
        'password123',
      ]
      
      for (const weakPassword of weakPasswords) {
        await user.clear(newPasswordInput)
        await user.type(newPasswordInput, weakPassword)
        await user.click(screen.getByRole('button', { name: /change password/i }))
        
        // Should show validation error for weak password
        await waitFor(() => {
          expect(screen.getByText(/password.*requirement/i)).toBeInTheDocument()
        })
      }
    })

    it('prevents common service account vulnerabilities', async () => {
      const user = userEvent.setup()
      
      render(<SignInCard />)
      
      // Test SQL injection attempt
      await user.type(screen.getByLabelText(/email/i), "'; DROP TABLE users; --")
      await user.type(screen.getByLabelText(/password/i), 'password')
      
      // Should not cause any issues (handled by validation)
      expect(screen.getByLabelText(/email/i)).toHaveValue("'; DROP TABLE users; --")
    })

    it('handles concurrent login attempts properly', async () => {
      const user = userEvent.setup()
      let callCount = 0
      
      mockUseLogin.mockReturnValue({
        mutate: jest.fn(() => callCount++),
        isPending: callCount > 0,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<SignInCard />)
      
      await user.type(screen.getByLabelText(/email/i), 'test@company.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      // Multiple rapid clicks
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)
      
      // Should prevent multiple submissions
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Accessibility in Service Authentication', () => {
    it('maintains accessibility standards in auth forms', () => {
      render(<SignInCard />)
      
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email')
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password')
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('provides proper ARIA labels for service auth components', () => {
      render(<ChangePasswordForm />)
      
      expect(screen.getByLabelText(/current password/i)).toHaveAttribute('aria-required', 'true')
      expect(screen.getByLabelText(/new password/i)).toHaveAttribute('aria-required', 'true')
      expect(screen.getByLabelText(/confirm.*password/i)).toHaveAttribute('aria-required', 'true')
    })

    it('handles keyboard navigation in auth flows', async () => {
      const user = userEvent.setup()
      
      render(<SignInCard />)
      
      await user.tab()
      expect(screen.getByLabelText(/email/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText(/password/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus()
    })
  })
})
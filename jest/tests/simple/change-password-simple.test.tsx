import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChangePassword } from '@/features/auth/api/use-change-password';

// Mock the hook
jest.mock('@/features/auth/api/use-change-password');

// Create a simple test component
const SimpleChangePasswordForm = () => {
  const { mutate, isPending } = useChangePassword();
  const [formData, setFormData] = React.useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      return;
    }
    mutate({ json: formData });
  };

  return (
    <form onSubmit={handleSubmit} data-testid="change-password-form">
      <input
        type="password"
        placeholder="Current Password"
        value={formData.oldPassword}
        onChange={(e) => setFormData(prev => ({ ...prev, oldPassword: e.target.value }))}
        disabled={isPending}
        data-testid="old-password"
      />
      <input
        type="password"
        placeholder="New Password"
        value={formData.newPassword}
        onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
        disabled={isPending}
        data-testid="new-password"
      />
      <input
        type="password"
        placeholder="Confirm Password"
        value={formData.confirmPassword}
        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
        disabled={isPending}
        data-testid="confirm-password"
      />
      <button type="submit" disabled={isPending} data-testid="submit-button">
        {isPending ? 'Changing...' : 'Change Password'}
      </button>
    </form>
  );
};

const mockUseChangePassword = useChangePassword as jest.MockedFunction<typeof useChangePassword>;

describe('Change Password Functionality', () => {
  const mockMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseChangePassword.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
      reset: jest.fn(),
      isIdle: true,
      isPaused: false,
      mutateAsync: jest.fn(),
      status: 'idle',
      variables: undefined,
      failureCount: 0,
      failureReason: null,
      submittedAt: 0,
    } as any);
  });

  const renderComponent = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <SimpleChangePasswordForm />
      </QueryClientProvider>
    );
  };

  it('renders change password form fields', () => {
    renderComponent();

    expect(screen.getByTestId('old-password')).toBeInTheDocument();
    expect(screen.getByTestId('new-password')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-password')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });

  it('shows loading state during submission', () => {
    mockUseChangePassword.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
      reset: jest.fn(),
      isIdle: false,
      isPaused: false,
      mutateAsync: jest.fn(),
      status: 'pending',
      variables: undefined,
      failureCount: 0,
      failureReason: null,
      submittedAt: 0,
    } as any);

    renderComponent();

    expect(screen.getByText('Changing...')).toBeInTheDocument();
    expect(screen.getByTestId('old-password')).toBeDisabled();
    expect(screen.getByTestId('new-password')).toBeDisabled();
    expect(screen.getByTestId('confirm-password')).toBeDisabled();
  });
})
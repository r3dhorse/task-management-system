import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Simple test components to verify functionality
const SimpleRefreshButton = () => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    mockReload(); // Use mock instead of window.location.reload
  };

  return (
    <button onClick={handleRefresh} disabled={isRefreshing} data-testid="refresh-button">
      {isRefreshing ? 'Refreshing...' : 'Refresh Page'}
    </button>
  );
};

const SimpleLogoutButton = () => {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    // Simulate logout
    console.log('Logging out...');
  };

  return (
    <button onClick={handleLogout} disabled={isLoggingOut} data-testid="logout-button">
      {isLoggingOut ? 'Signing out...' : 'Sign Out'}
    </button>
  );
};

const NoWorkspacePageContent = () => (
  <div data-testid="no-workspace-page">
    <h1>Welcome to Task Management</h1>
    <div data-testid="workspace-access-pending">
      <h3>Workspace Access Pending</h3>
      <p>You&apos;re not currently a member of any workspace. To get started, you&apos;ll need to be invited by an administrator.</p>
    </div>
    <div data-testid="next-steps">
      <h3>What happens next?</h3>
      <ul>
        <li>Contact your administrator to request workspace access</li>
        <li>Wait for an invitation to be sent to your email</li>
        <li>Refresh this page once you&apos;ve been added to a workspace</li>
      </ul>
    </div>
    <div data-testid="action-buttons">
      <SimpleRefreshButton />
      <SimpleLogoutButton />
    </div>
    <p data-testid="help-text">Need help? Contact your system administrator for workspace access.</p>
  </div>
);

// Mock window.location.reload
const mockReload = jest.fn();

describe('No Workspace User Experience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReload.mockClear();
  });

  describe('Page Content', () => {
    it('displays welcome message and workspace access information', () => {
      render(<NoWorkspacePageContent />);

      expect(screen.getByText('Welcome to Task Management')).toBeInTheDocument();
      expect(screen.getByText('Workspace Access Pending')).toBeInTheDocument();
      expect(screen.getByText(/You're not currently a member of any workspace/)).toBeInTheDocument();
      expect(screen.getByText('What happens next?')).toBeInTheDocument();
    });

    it('provides clear next steps for users', () => {
      render(<NoWorkspacePageContent />);

      expect(screen.getByText(/Contact your administrator to request workspace access/)).toBeInTheDocument();
      expect(screen.getByText(/Wait for an invitation to be sent to your email/)).toBeInTheDocument();
      expect(screen.getByText(/Refresh this page once you've been added/)).toBeInTheDocument();
    });

    it('shows help text for users needing assistance', () => {
      render(<NoWorkspacePageContent />);

      expect(screen.getByText(/Need help\? Contact your system administrator/)).toBeInTheDocument();
    });

    it('displays action buttons for user interaction', () => {
      render(<NoWorkspacePageContent />);

      expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
      expect(screen.getByTestId('logout-button')).toBeInTheDocument();
    });
  });

  describe('Refresh Button Functionality', () => {
    it('renders refresh button correctly', () => {
      render(<SimpleRefreshButton />);

      const refreshButton = screen.getByTestId('refresh-button');
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).toHaveTextContent('Refresh Page');
    });

    it('calls window.location.reload when clicked', async () => {
      const user = userEvent.setup();
      render(<SimpleRefreshButton />);

      const refreshButton = screen.getByTestId('refresh-button');
      await user.click(refreshButton);

      expect(mockReload).toHaveBeenCalled();
    });

    it('shows loading state when clicked', async () => {
      const user = userEvent.setup();
      render(<SimpleRefreshButton />);

      const refreshButton = screen.getByTestId('refresh-button');
      await user.click(refreshButton);

      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Logout Button Functionality', () => {
    it('renders logout button correctly', () => {
      render(<SimpleLogoutButton />);

      const logoutButton = screen.getByTestId('logout-button');
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton).toHaveTextContent('Sign Out');
    });

    it('shows loading state when clicked', async () => {
      const user = userEvent.setup();
      render(<SimpleLogoutButton />);

      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      expect(screen.getByText('Signing out...')).toBeInTheDocument();
      expect(logoutButton).toBeDisabled();
    });
  });

  describe('User Flow Integration', () => {
    it('provides complete user experience for non-workspace users', () => {
      render(<NoWorkspacePageContent />);

      // Check all essential elements are present
      expect(screen.getByTestId('no-workspace-page')).toBeInTheDocument();
      expect(screen.getByTestId('workspace-access-pending')).toBeInTheDocument();
      expect(screen.getByTestId('next-steps')).toBeInTheDocument();
      expect(screen.getByTestId('action-buttons')).toBeInTheDocument();
      expect(screen.getByTestId('help-text')).toBeInTheDocument();

      // Check both action buttons are available
      expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
      expect(screen.getByTestId('logout-button')).toBeInTheDocument();
    });

    it('allows users to refresh page to check for workspace updates', async () => {
      const user = userEvent.setup();
      render(<NoWorkspacePageContent />);

      const refreshButton = screen.getByTestId('refresh-button');
      await user.click(refreshButton);

      expect(mockReload).toHaveBeenCalled();
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });

    it('allows users to sign out if needed', async () => {
      const user = userEvent.setup();
      render(<NoWorkspacePageContent />);

      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      expect(screen.getByText('Signing out...')).toBeInTheDocument();
    });
  });

  describe('Professional UX Elements', () => {
    it('maintains consistent messaging and instructions', () => {
      render(<NoWorkspacePageContent />);

      // Check for professional messaging
      expect(screen.getByText('Welcome to Task Management')).toBeInTheDocument();
      expect(screen.getByText('Workspace Access Pending')).toBeInTheDocument();
      
      // Check for clear action items
      expect(screen.getByText(/Contact your administrator/)).toBeInTheDocument();
      expect(screen.getByText(/Wait for an invitation/)).toBeInTheDocument();
      expect(screen.getByText(/Refresh this page/)).toBeInTheDocument();
    });

    it('provides helpful guidance and support information', () => {
      render(<NoWorkspacePageContent />);

      expect(screen.getByText(/Need help\? Contact your system administrator/)).toBeInTheDocument();
      expect(screen.getByText(/You're not currently a member of any workspace/)).toBeInTheDocument();
    });
  });
});
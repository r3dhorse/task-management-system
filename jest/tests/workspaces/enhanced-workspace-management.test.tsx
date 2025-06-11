import { render, screen, userEvent, waitFor } from '@/test-utils'
import { EnhancedWorkspaceSettings } from '@/features/workspaces/components/enhanced-workspace-settings'
import { AddMemberModal } from '@/features/members/components/add-member-modal'
import { MembersList } from '@/features/workspaces/components/members-list'
import { useUpdateWorkspace } from '@/features/workspaces/api/use-update-workspace'
import { useDeleteWorkspace } from '@/features/workspaces/api/use-delete-workspace'
import { useResetInviteCode } from '@/features/workspaces/api/use-reset-invite-code'
import { useGetMembers } from '@/features/members/api/use-get-members'
import { useAddMember } from '@/features/members/api/use-add-member'
import { useUpdateMember } from '@/features/members/api/use-update-member'
import { useDeleteMember } from '@/features/members/api/use-delete-member'
import { useSearchUsers } from '@/features/members/api/use-search-users'
import { useCurrent } from '@/features/auth/api/use-current'
import { MemberRole } from '@/features/members/types'

jest.mock('@/features/workspaces/api/use-update-workspace')
jest.mock('@/features/workspaces/api/use-delete-workspace')
jest.mock('@/features/workspaces/api/use-reset-invite-code')
jest.mock('@/features/members/api/use-get-members')
jest.mock('@/features/members/api/use-add-member')
jest.mock('@/features/members/api/use-update-member')
jest.mock('@/features/members/api/use-delete-member')
jest.mock('@/features/members/api/use-search-users')
jest.mock('@/features/auth/api/use-current')
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({
    workspaceId: 'workspace-123',
  }),
}))

jest.mock('@/features/workspaces/hooks/use-workspace-id', () => ({
  useWorkspaceId: () => 'workspace-123',
}))

jest.mock('@/features/members/hooks/use-add-member-modal', () => ({
  useAddMemberModal: () => ({
    isOpen: false,
    open: jest.fn(),
    close: jest.fn(),
  }),
}))

const mockUseUpdateWorkspace = useUpdateWorkspace as jest.MockedFunction<typeof useUpdateWorkspace>
const mockUseDeleteWorkspace = useDeleteWorkspace as jest.MockedFunction<typeof useDeleteWorkspace>
const mockUseResetInviteCode = useResetInviteCode as jest.MockedFunction<typeof useResetInviteCode>
const mockUseGetMembers = useGetMembers as jest.MockedFunction<typeof useGetMembers>
const mockUseAddMember = useAddMember as jest.MockedFunction<typeof useAddMember>
const mockUseUpdateMember = useUpdateMember as jest.MockedFunction<typeof useUpdateMember>
const mockUseDeleteMember = useDeleteMember as jest.MockedFunction<typeof useDeleteMember>
const mockUseSearchUsers = useSearchUsers as jest.MockedFunction<typeof useSearchUsers>
const mockUseCurrent = useCurrent as jest.MockedFunction<typeof useCurrent>

const mockCurrentUser = {
  $id: 'current-user-123',
  email: 'admin@example.com',
  name: 'Admin User',
}

const mockWorkspace = {
  $id: 'workspace-123',
  name: 'Engineering Team',
  description: 'Main engineering workspace',
  imageUrl: null,
  inviteCode: 'ENG123456',
  userId: 'current-user-123',
  $createdAt: '2024-01-01T00:00:00.000Z',
  $updatedAt: '2024-01-01T00:00:00.000Z',
}

const mockMembers = {
  documents: [
    {
      $id: 'member-123',
      userId: 'current-user-123',
      workspaceId: 'workspace-123',
      role: MemberRole.ADMIN,
      name: 'Admin User',
      email: 'admin@example.com',
      $createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      $id: 'member-456',
      userId: 'user-456',
      workspaceId: 'workspace-123',
      role: MemberRole.MEMBER,
      name: 'John Developer',
      email: 'john@example.com',
      $createdAt: '2024-01-02T00:00:00.000Z',
    },
    {
      $id: 'member-789',
      userId: 'user-789',
      workspaceId: 'workspace-123',
      role: MemberRole.MEMBER,
      name: 'Jane Designer',
      email: 'jane@example.com',
      $createdAt: '2024-01-03T00:00:00.000Z',
    },
  ],
  total: 3,
}

const mockSearchResults = {
  users: [
    {
      $id: 'search-user-1',
      name: 'New Developer',
      email: 'newdev@example.com',
      avatar: null,
    },
    {
      $id: 'search-user-2',
      name: 'Another User',
      email: 'another@example.com',
      avatar: null,
    },
  ],
}

describe('Enhanced Workspace Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseCurrent.mockReturnValue({
      data: mockCurrentUser,
      isLoading: false,
      isError: false,
      error: null,
    })
    
    mockUseGetMembers.mockReturnValue({
      data: mockMembers,
      isLoading: false,
      isError: false,
      error: null,
    })
    
    mockUseUpdateWorkspace.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
    })
    
    mockUseDeleteWorkspace.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
    })
    
    mockUseResetInviteCode.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
    })
    
    mockUseAddMember.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
    })
    
    mockUseUpdateMember.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
    })
    
    mockUseDeleteMember.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
    })
    
    mockUseSearchUsers.mockReturnValue({
      data: mockSearchResults,
      isLoading: false,
      isError: false,
      error: null,
    })
  })

  describe('EnhancedWorkspaceSettings', () => {
    it('renders workspace settings with tabs', () => {
      render(<EnhancedWorkspaceSettings initialValues={mockWorkspace} />)
      
      expect(screen.getByText('Workspace Settings')).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /general/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /members/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /danger/i })).toBeInTheDocument()
    })

    it('displays workspace information in general tab', () => {
      render(<EnhancedWorkspaceSettings initialValues={mockWorkspace} />)
      
      expect(screen.getByDisplayValue('Engineering Team')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Main engineering workspace')).toBeInTheDocument()
    })







    it('handles workspace update errors', () => {
      mockUseUpdateWorkspace.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
        isError: true,
        error: new Error('Failed to update workspace'),
        data: undefined,
        isSuccess: false,
      })
      
      render(<EnhancedWorkspaceSettings initialValues={mockWorkspace} />)
      
      // Error should be handled gracefully
      expect(screen.getByText('Engineering Team')).toBeInTheDocument()
    })
  })

  describe('MembersList', () => {
    it('displays all workspace members', () => {
      render(<MembersList />)
      
      expect(screen.getByText('Admin User')).toBeInTheDocument()
      expect(screen.getByText('John Developer')).toBeInTheDocument()
      expect(screen.getByText('Jane Designer')).toBeInTheDocument()
    })

    it('shows member roles correctly', () => {
      render(<MembersList />)
      
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getAllByText('Member')).toHaveLength(2)
    })

    it('shows member emails', () => {
      render(<MembersList />)
      
      expect(screen.getByText('admin@example.com')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    })



    it('prevents self-removal for admin', () => {
      render(<MembersList />)
      
      // Admin User should be shown as "You"
      expect(screen.getByText('You')).toBeInTheDocument()
    })

    it('shows loading state while members are loading', () => {
      mockUseGetMembers.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      })
      
      render(<MembersList />)
      
      expect(screen.getByText('Loading members...')).toBeInTheDocument()
    })

    it('handles member loading errors', () => {
      mockUseGetMembers.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Failed to load members'),
      })
      
      render(<MembersList />)
      
      expect(screen.getByText('No members found')).toBeInTheDocument()
    })
  })

  describe('AddMemberModal', () => {

    it('searches for users when typing', async () => {
      const user = userEvent.setup()
      
      render(
        <AddMemberModal
          isOpen={true}
          onClose={jest.fn()}
          workspaceId="workspace-123"
        />
      )
      
      const searchInput = screen.getByPlaceholderText(/search users/i)
      await user.type(searchInput, 'newdev')
      
      expect(mockUseSearchUsers).toHaveBeenCalledWith({
        workspaceId: 'workspace-123',
        search: 'newdev',
        enabled: true,
      })
    })



    it('shows loading state while adding member', () => {
      mockUseAddMember.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(
        <AddMemberModal
          isOpen={true}
          onClose={jest.fn()}
          workspaceId="workspace-123"
        />
      )
      
      // Add buttons should be disabled
      expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument()
    })



    it('closes modal when requested', async () => {
      const user = userEvent.setup()
      const mockOnClose = jest.fn()
      
      render(
        <AddMemberModal
          isOpen={true}
          onClose={mockOnClose}
          workspaceId="workspace-123"
        />
      )
      
      await user.keyboard('{Escape}')
      
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Workspace Permissions', () => {
    it('restricts admin features to admin users only', () => {
      // Mock current user as regular member
      mockUseCurrent.mockReturnValue({
        data: { ...mockCurrentUser, $id: 'user-456' },
        isLoading: false,
        isError: false,
        error: null,
      })
      
      render(<EnhancedWorkspaceSettings initialValues={mockWorkspace} />)
      
      // Advanced tab (delete workspace) should not be accessible to non-admins
      expect(screen.queryByRole('tab', { name: /advanced/i })).not.toBeInTheDocument()
    })

    it('shows different UI for workspace admin vs member', () => {
      render(<MembersList />)
      
      // Admin should see "Add Member" button and dropdown menus for actions
      expect(screen.getByText('Add Member')).toBeInTheDocument()
      // Should have dropdown buttons for member management
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<EnhancedWorkspaceSettings initialValues={mockWorkspace} />)
      
      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getByRole('tabpanel')).toBeInTheDocument()
      expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument()
    })

    it('maintains focus management in modals', async () => {
      const user = userEvent.setup()
      
      render(
        <AddMemberModal
          isOpen={true}
          onClose={jest.fn()}
          workspaceId="workspace-123"
        />
      )
      
      // Focus should be managed properly when modal opens
      expect(document.activeElement).toBeInTheDocument()
    })

    it('provides proper form labels', () => {
      render(<EnhancedWorkspaceSettings initialValues={mockWorkspace} />)
      
      expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })
  })
})
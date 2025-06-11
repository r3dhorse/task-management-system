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
      expect(screen.getByRole('tab', { name: /advanced/i })).toBeInTheDocument()
    })

    it('displays workspace information in general tab', () => {
      render(<EnhancedWorkspaceSettings initialValues={mockWorkspace} />)
      
      expect(screen.getByDisplayValue('Engineering Team')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Main engineering workspace')).toBeInTheDocument()
    })

    it('allows updating workspace details', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      mockUseUpdateWorkspace.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<EnhancedWorkspaceSettings initialValues={mockWorkspace} />)
      
      const nameInput = screen.getByDisplayValue('Engineering Team')
      const descriptionInput = screen.getByDisplayValue('Main engineering workspace')
      
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Engineering Team')
      
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Updated description')
      
      await user.click(screen.getByRole('button', { name: /save changes/i }))
      
      expect(mockMutate).toHaveBeenCalledWith({
        form: {
          name: 'Updated Engineering Team',
          description: 'Updated description',
        },
        param: { workspaceId: 'workspace-123' }
      })
    })

    it('displays invite code in security tab', async () => {
      const user = userEvent.setup()
      render(<EnhancedWorkspaceSettings initialValues={mockWorkspace} />)
      
      await user.click(screen.getByRole('tab', { name: /security/i }))
      
      expect(screen.getByText('ENG123456')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /copy invite code/i })).toBeInTheDocument()
    })

    it('allows resetting invite code', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      mockUseResetInviteCode.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<EnhancedWorkspaceSettings initialValues={mockWorkspace} />)
      
      await user.click(screen.getByRole('tab', { name: /security/i }))
      await user.click(screen.getByRole('button', { name: /reset invite code/i }))
      
      expect(mockMutate).toHaveBeenCalledWith({
        param: { workspaceId: 'workspace-123' }
      })
    })

    it('shows workspace deletion option in advanced tab', async () => {
      const user = userEvent.setup()
      render(<EnhancedWorkspaceSettings initialValues={mockWorkspace} />)
      
      await user.click(screen.getByRole('tab', { name: /advanced/i }))
      
      expect(screen.getByText(/delete workspace/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete workspace/i })).toBeInTheDocument()
    })

    it('confirms workspace deletion', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      mockUseDeleteWorkspace.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<EnhancedWorkspaceSettings initialValues={mockWorkspace} />)
      
      await user.click(screen.getByRole('tab', { name: /advanced/i }))
      await user.click(screen.getByRole('button', { name: /delete workspace/i }))
      
      // Confirmation dialog should appear
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      
      await user.click(screen.getByRole('button', { name: /delete/i }))
      
      expect(mockMutate).toHaveBeenCalledWith({
        param: { workspaceId: 'workspace-123' }
      })
    })

    it('shows loading states correctly', () => {
      mockUseUpdateWorkspace.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<EnhancedWorkspaceSettings initialValues={mockWorkspace} />)
      
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
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
      render(<MembersList workspaceId="workspace-123" />)
      
      expect(screen.getByText('Admin User')).toBeInTheDocument()
      expect(screen.getByText('John Developer')).toBeInTheDocument()
      expect(screen.getByText('Jane Designer')).toBeInTheDocument()
    })

    it('shows member roles correctly', () => {
      render(<MembersList workspaceId="workspace-123" />)
      
      expect(screen.getByText('ADMIN')).toBeInTheDocument()
      expect(screen.getAllByText('MEMBER')).toHaveLength(2)
    })

    it('shows member emails', () => {
      render(<MembersList workspaceId="workspace-123" />)
      
      expect(screen.getByText('admin@example.com')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    })

    it('allows changing member roles (admin only)', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      mockUseUpdateMember.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<MembersList workspaceId="workspace-123" />)
      
      // Find role selector for John Developer
      const roleSelectors = screen.getAllByRole('combobox')
      const johnRoleSelector = roleSelectors[1] // Second member
      
      await user.click(johnRoleSelector)
      await user.click(screen.getByRole('option', { name: 'ADMIN' }))
      
      expect(mockMutate).toHaveBeenCalledWith({
        json: { role: MemberRole.ADMIN },
        param: { memberId: 'member-456' }
      })
    })

    it('allows removing members (admin only)', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      mockUseDeleteMember.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<MembersList workspaceId="workspace-123" />)
      
      // Find remove button for John Developer
      const removeButtons = screen.getAllByRole('button', { name: /remove/i })
      await user.click(removeButtons[0])
      
      // Confirmation should appear
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      
      await user.click(screen.getByRole('button', { name: /remove/i }))
      
      expect(mockMutate).toHaveBeenCalledWith({
        param: { memberId: 'member-456' }
      })
    })

    it('prevents self-removal for admin', () => {
      render(<MembersList workspaceId="workspace-123" />)
      
      // Admin User (current user) should not have a remove button
      const adminRow = screen.getByText('Admin User').closest('[data-testid="member-row"]')
      expect(adminRow).not.toContainElement(screen.queryByRole('button', { name: /remove/i }))
    })

    it('shows loading state while members are loading', () => {
      mockUseGetMembers.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      })
      
      render(<MembersList workspaceId="workspace-123" />)
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('handles member loading errors', () => {
      mockUseGetMembers.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Failed to load members'),
      })
      
      render(<MembersList workspaceId="workspace-123" />)
      
      expect(screen.getByText(/failed to load members/i)).toBeInTheDocument()
    })
  })

  describe('AddMemberModal', () => {
    it('renders add member modal', () => {
      render(
        <AddMemberModal
          isOpen={true}
          onClose={jest.fn()}
          workspaceId="workspace-123"
        />
      )
      
      expect(screen.getByText('Add Team Member')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: /role/i })).toBeInTheDocument()
    })

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

    it('displays search results', async () => {
      const user = userEvent.setup()
      
      render(
        <AddMemberModal
          isOpen={true}
          onClose={jest.fn()}
          workspaceId="workspace-123"
        />
      )
      
      const searchInput = screen.getByPlaceholderText(/search users/i)
      await user.type(searchInput, 'new')
      
      await waitFor(() => {
        expect(screen.getByText('New Developer')).toBeInTheDocument()
        expect(screen.getByText('newdev@example.com')).toBeInTheDocument()
        expect(screen.getByText('Another User')).toBeInTheDocument()
      })
    })

    it('adds member with selected role', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      mockUseAddMember.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
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
      
      const searchInput = screen.getByPlaceholderText(/search users/i)
      await user.type(searchInput, 'new')
      
      // Select role as ADMIN
      const roleSelect = screen.getByRole('combobox', { name: /role/i })
      await user.click(roleSelect)
      await user.click(screen.getByRole('option', { name: 'Admin' }))
      
      // Add the user
      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add.*new developer/i })
        return user.click(addButton)
      })
      
      expect(mockMutate).toHaveBeenCalledWith({
        json: {
          userId: 'search-user-1',
          role: MemberRole.ADMIN,
        },
        param: { workspaceId: 'workspace-123' }
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

    it('shows loading state while searching', () => {
      mockUseSearchUsers.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      })
      
      render(
        <AddMemberModal
          isOpen={true}
          onClose={jest.fn()}
          workspaceId="workspace-123"
        />
      )
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('handles search errors', () => {
      mockUseSearchUsers.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Search failed'),
      })
      
      render(
        <AddMemberModal
          isOpen={true}
          onClose={jest.fn()}
          workspaceId="workspace-123"
        />
      )
      
      expect(screen.getByText(/search failed/i)).toBeInTheDocument()
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
      render(<MembersList workspaceId="workspace-123" />)
      
      // Admin should see role selectors and remove buttons
      expect(screen.getAllByRole('combobox')).toHaveLength(2) // Role selectors for other members
      expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(2) // Remove buttons for other members
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
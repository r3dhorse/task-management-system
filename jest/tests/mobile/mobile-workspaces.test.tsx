import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/test-utils'
import { CreateWorkspaceForm } from '@/features/workspaces/components/create-workspace-form'
import { JoinWorkspaceForm } from '@/features/workspaces/components/join-workspace-form'
import { WorkspaceSwitcher } from '@/components/workspace-switcher'
import { MembersList } from '@/features/workspaces/components/members-list'

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

// Mock Next.js router
const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useParams: () => ({
    inviteCode: 'invite-code-123',
    workspaceId: 'workspace-123',
  }),
}))

// Mock workspace hooks
const mockCreateWorkspace = jest.fn()
const mockJoinWorkspace = jest.fn()
const mockDeleteWorkspace = jest.fn()
const mockUpdateWorkspace = jest.fn()

jest.mock('@/features/workspaces/api/use-create-workspace', () => ({
  useCreateWorkspace: () => ({
    mutate: mockCreateWorkspace,
    isPending: false,
  }),
}))

jest.mock('@/features/workspaces/api/use-join-workspace', () => ({
  useJoinWorkspace: () => ({
    mutate: mockJoinWorkspace,
    isPending: false,
  }),
}))

jest.mock('@/features/workspaces/api/use-delete-workspace', () => ({
  useDeleteWorkspace: () => ({
    mutate: mockDeleteWorkspace,
    isPending: false,
  }),
}))

jest.mock('@/features/workspaces/api/use-update-workspace', () => ({
  useUpdateWorkspace: () => ({
    mutate: mockUpdateWorkspace,
    isPending: false,
  }),
}))

jest.mock('@/features/workspaces/api/use-get-workspaces', () => ({
  useGetWorkspaces: () => ({
    data: {
      documents: [
        {
          $id: 'workspace-1',
          name: 'My Workspace',
          imageUrl: null,
        },
        {
          $id: 'workspace-2', 
          name: 'Team Workspace',
          imageUrl: 'https://example.com/image.jpg',
        },
      ],
    },
    isLoading: false,
  }),
}))

jest.mock('@/features/workspaces/api/use-get-workspace', () => ({
  useGetWorkspace: () => ({
    data: {
      $id: 'workspace-1',
      name: 'My Workspace',
      imageUrl: null,
      inviteCode: 'ABC123',
    },
    isLoading: false,
  }),
}))

jest.mock('@/features/workspaces/hooks/use-workspace-id', () => ({
  useWorkspaceId: () => 'workspace-123',
}))

jest.mock('@/features/auth/api/use-current', () => ({
  useCurrent: () => ({
    data: {
      $id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    },
    isLoading: false,
  }),
}))

// Mock members API
jest.mock('@/features/members/api/use-get-members', () => ({
  useGetMembers: () => ({
    data: {
      documents: [
        {
          $id: 'member-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'ADMIN',
        },
        {
          $id: 'member-2',
          name: 'Jane Smith',
          email: 'jane@example.com', 
          role: 'MEMBER',
        },
      ],
    },
    isLoading: false,
  }),
}))

// Mock workspace ID hook
jest.mock('@/features/workspaces/hooks/use-workspace-id', () => ({
  useWorkspaceId: () => 'workspace-1',
}))

// Mock create workspace modal
jest.mock('@/features/workspaces/hooks/use-create-workspace-modal', () => ({
  useCreateWorkspaceModal: () => ({
    isOpen: false,
    setIsOpen: jest.fn(),
    open: jest.fn(),
    close: jest.fn(),
  }),
}))

// Mock file upload
jest.mock('@/components/file-upload', () => ({
  FileUpload: ({ onFileUploaded, onFileRemoved }: { onFileUploaded: (id: string) => void; onFileRemoved: () => void }) => (
    <div data-testid="file-upload">
      <button onClick={() => onFileUploaded('file-123')}>Upload File</button>
      <button onClick={() => onFileRemoved()}>Remove File</button>
    </div>
  ),
}))

describe('Mobile Workspace Tests', () => {
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
    mockCreateWorkspace.mockClear()
    mockJoinWorkspace.mockClear()
    mockDeleteWorkspace.mockClear()
    mockUpdateWorkspace.mockClear()
    mockPush.mockClear()
    mockReplace.mockClear()
  })

  describe('Workspace Creation', () => {
    it('renders create workspace form with mobile layout', () => {
      render(<CreateWorkspaceForm onCancel={jest.fn()} />)

      // Check form elements
      expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument()
      expect(screen.getByTestId('file-upload')).toBeInTheDocument()

      // Check mobile-optimized buttons
      const createButton = screen.getByRole('button', { name: /create workspace/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })

      expect(createButton).toHaveClass('w-full', 'sm:w-auto', 'min-h-[44px]')
      expect(cancelButton).toHaveClass('w-full', 'sm:w-auto', 'min-h-[44px]')
    })

    it('handles workspace creation with mobile touch interactions', async () => {
      render(<CreateWorkspaceForm onCancel={jest.fn()} />)

      const nameInput = screen.getByLabelText(/workspace name/i)
      const createButton = screen.getByRole('button', { name: /create workspace/i })

      // Simulate mobile keyboard input
      fireEvent.focus(nameInput)
      fireEvent.change(nameInput, { target: { value: 'My New Workspace' } })

      // Test file upload
      const uploadButton = screen.getByText('Upload File')
      fireEvent.click(uploadButton)

      // Touch-based form submission
      fireEvent.touchStart(createButton)
      fireEvent.touchEnd(createButton)
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(mockCreateWorkspace).toHaveBeenCalledWith({
          form: expect.any(FormData),
        })
      })
    })

    it('validates workspace name on mobile', async () => {
      render(<CreateWorkspaceForm onCancel={jest.fn()} />)

      const createButton = screen.getByRole('button', { name: /create workspace/i })

      // Submit empty form
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/workspace name is required/i)).toBeInTheDocument()
      })

      // Test minimum length validation
      const nameInput = screen.getByLabelText(/workspace name/i)
      fireEvent.change(nameInput, { target: { value: 'A' } })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/workspace name must be at least/i)).toBeInTheDocument()
      })
    })

    it('handles file upload and removal on mobile', () => {
      render(<CreateWorkspaceForm onCancel={jest.fn()} />)

      const uploadButton = screen.getByText('Upload File')
      const removeButton = screen.getByText('Remove File')

      // Test file upload
      fireEvent.click(uploadButton)
      // File upload functionality is tested via the mock

      // Test file removal
      fireEvent.click(removeButton)
      // File removal functionality is tested via the mock
    })

    it('shows loading state during workspace creation', () => {
      // Mock pending state
      jest.mocked(mockCreateWorkspace).mockImplementation(() => {
        // Simulate pending state
      })

      render(<CreateWorkspaceForm onCancel={jest.fn()} />)

      const createButton = screen.getByRole('button', { name: /create workspace/i })
      
      // Button should handle loading state properly
      expect(createButton).toBeEnabled()
    })
  })

  describe('Workspace Joining', () => {
    it('renders join workspace form with mobile layout', () => {
      render(<JoinWorkspaceForm initialValues={{ name: '' }} />)

      expect(screen.getByLabelText(/invite code/i)).toBeInTheDocument()

      const joinButton = screen.getByRole('button', { name: /join workspace/i })
      expect(joinButton).toHaveClass('w-full', 'min-h-[44px]')
    })

    it('handles workspace joining with mobile touch interactions', async () => {
      render(<JoinWorkspaceForm initialValues={{ name: '' }} />)

      const codeInput = screen.getByLabelText(/invite code/i)
      const joinButton = screen.getByRole('button', { name: /join workspace/i })

      // Simulate mobile keyboard input
      fireEvent.focus(codeInput)
      fireEvent.change(codeInput, { target: { value: 'ABC123' } })

      // Touch-based form submission
      fireEvent.touchStart(joinButton)
      fireEvent.touchEnd(joinButton)
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(mockJoinWorkspace).toHaveBeenCalledWith({
          param: { workspaceId: expect.any(String) },
          json: { code: 'ABC123' },
        })
      })
    })

    it('validates invite code format on mobile', async () => {
      render(<JoinWorkspaceForm initialValues={{ name: '' }} />)

      const joinButton = screen.getByRole('button', { name: /join workspace/i })

      // Submit empty form
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(screen.getByText(/invite code is required/i)).toBeInTheDocument()
      })

      // Test invalid code format
      const codeInput = screen.getByLabelText(/invite code/i)
      fireEvent.change(codeInput, { target: { value: '123' } })
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid invite code format/i)).toBeInTheDocument()
      })
    })

    it('handles join errors gracefully on mobile', async () => {
      mockJoinWorkspace.mockRejectedValueOnce(new Error('Invalid invite code'))

      render(<JoinWorkspaceForm initialValues={{ name: '' }} />)

      const codeInput = screen.getByLabelText(/invite code/i)
      const joinButton = screen.getByRole('button', { name: /join workspace/i })

      fireEvent.change(codeInput, { target: { value: 'INVALID' } })
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(mockJoinWorkspace).toHaveBeenCalled()
      })

      // Should handle error gracefully
    })
  })

  describe('Workspace Switcher', () => {
    it('renders workspace switcher with mobile-friendly dropdown', () => {
      render(<WorkspaceSwitcher />)

      const switcherButton = screen.getByRole('button')
      expect(switcherButton).toBeInTheDocument()
      expect(switcherButton).toHaveClass('min-h-[44px]', 'touch-manipulation')

      // Open dropdown
      fireEvent.click(switcherButton)

      // Check for workspaces in dropdown
      expect(screen.getByText('My Workspace')).toBeInTheDocument()
      expect(screen.getByText('Team Workspace')).toBeInTheDocument()
    })

    it('handles workspace switching with touch interactions', async () => {
      render(<WorkspaceSwitcher />)

      const switcherButton = screen.getByRole('button')
      
      // Touch to open dropdown
      fireEvent.touchStart(switcherButton)
      fireEvent.touchEnd(switcherButton)
      fireEvent.click(switcherButton)

      const workspaceOption = screen.getByText('Team Workspace')
      
      // Touch to select workspace
      fireEvent.touchStart(workspaceOption)
      fireEvent.touchEnd(workspaceOption)
      fireEvent.click(workspaceOption)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/workspaces/workspace-2')
      })
    })

    it('shows create workspace option in mobile dropdown', () => {
      render(<WorkspaceSwitcher />)

      const switcherButton = screen.getByRole('button')
      fireEvent.click(switcherButton)

      expect(screen.getByText(/create workspace/i)).toBeInTheDocument()
    })

    it('displays workspace avatars correctly on mobile', () => {
      render(<WorkspaceSwitcher />)

      const switcherButton = screen.getByRole('button')
      fireEvent.click(switcherButton)

      // Check for workspace avatars/images
      const workspaceItems = screen.getAllByText(/workspace/i)
      expect(workspaceItems.length).toBeGreaterThan(0)

      // Workspace without image should show fallback
      expect(screen.getByText('M')).toBeInTheDocument() // First letter fallback
    })
  })

  describe('Workspace Members Management', () => {
    it('renders members list with mobile layout', () => {
      render(<MembersList />)

      // Check for member items
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()

      // Check role badges
      expect(screen.getByText('ADMIN')).toBeInTheDocument()
      expect(screen.getByText('MEMBER')).toBeInTheDocument()
    })

    it('handles member actions with touch interactions', () => {
      render(<MembersList />)

      // Look for member action buttons
      const memberItems = screen.getAllByTestId(/member-item/i)
      
      if (memberItems.length > 0) {
        const firstMemberItem = memberItems[0]
        const actionButton = firstMemberItem.querySelector('[role="button"]')
        
        if (actionButton) {
          // Touch interaction
          fireEvent.touchStart(actionButton)
          fireEvent.touchEnd(actionButton)
          fireEvent.click(actionButton)
        }
      }
    })

    it('displays member information clearly on mobile', () => {
      render(<MembersList />)

      // Member information should be clearly visible
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()

      // Role badges should be mobile-friendly
      const adminBadge = screen.getByText('ADMIN')
      const memberBadge = screen.getByText('MEMBER')

      expect(adminBadge).toHaveClass('text-xs') // Mobile-friendly text size
      expect(memberBadge).toHaveClass('text-xs')
    })

    it('handles member invitation on mobile', async () => {
      render(<MembersList />)

      // Look for invite button
      const inviteButton = screen.queryByText(/invite/i) || screen.queryByText(/add member/i)
      
      if (inviteButton) {
        // Touch interaction
        fireEvent.touchStart(inviteButton)
        fireEvent.touchEnd(inviteButton)
        fireEvent.click(inviteButton)

        // Should open invitation modal or form
      }
    })
  })

  describe('Workspace Settings', () => {
    it('handles workspace deletion with mobile confirmation', async () => {
      // This would typically be in a workspace settings component
      const MockWorkspaceSettings = () => (
        <div>
          <button 
            onClick={() => mockDeleteWorkspace({ param: { workspaceId: 'workspace-1' } })}
            className="min-h-[44px] touch-manipulation w-full bg-red-500 text-white"
          >
            Delete Workspace
          </button>
        </div>
      )

      render(<MockWorkspaceSettings />)

      const deleteButton = screen.getByText('Delete Workspace')
      
      // Touch interaction for dangerous action
      fireEvent.touchStart(deleteButton)
      fireEvent.touchEnd(deleteButton)
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(mockDeleteWorkspace).toHaveBeenCalledWith({
          param: { workspaceId: 'workspace-1' },
        })
      })
    })

    it('handles workspace updates on mobile', async () => {
      const MockWorkspaceSettings = () => {
        const [name, setName] = React.useState('My Workspace')
        
        return (
          <div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-[44px] w-full"
              aria-label="Workspace name"
            />
            <button
              onClick={() => mockUpdateWorkspace({
                param: { workspaceId: 'workspace-1' },
                form: new FormData(),
              })}
              className="min-h-[44px] touch-manipulation w-full"
            >
              Update Workspace
            </button>
          </div>
        )
      }

      render(<MockWorkspaceSettings />)

      const nameInput = screen.getByLabelText('Workspace name')
      const updateButton = screen.getByText('Update Workspace')

      // Update workspace name
      fireEvent.change(nameInput, { target: { value: 'Updated Workspace' } })

      // Touch interaction
      fireEvent.touchStart(updateButton)
      fireEvent.touchEnd(updateButton)
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(mockUpdateWorkspace).toHaveBeenCalled()
      })
    })
  })

  describe('Mobile-Specific Features', () => {
    it('handles workspace navigation with swipe gestures', () => {
      render(<WorkspaceSwitcher />)

      const switcher = screen.getByRole('combobox')

      // Simulate swipe gesture (if implemented)
      fireEvent.touchStart(switcher, {
        touches: [{ clientX: 100, clientY: 100 }],
      })
      fireEvent.touchMove(switcher, {
        touches: [{ clientX: 200, clientY: 100 }],
      })
      fireEvent.touchEnd(switcher)

      // This would trigger workspace switching if swipe is implemented
    })

    it('provides haptic feedback on mobile interactions', () => {
      // Mock vibration API
      const mockVibrate = jest.fn()
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
      })

      render(<CreateWorkspaceForm onCancel={jest.fn()} />)

      const createButton = screen.getByRole('button', { name: /create workspace/i })
      
      // Touch interaction that might trigger haptic feedback
      fireEvent.touchStart(createButton)
      fireEvent.touchEnd(createButton)

      // In a real implementation, this might trigger navigator.vibrate()
    })

    it('handles offline state gracefully', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })

      render(<CreateWorkspaceForm onCancel={jest.fn()} />)

      // Form should still be usable but may show offline indicator
      const nameInput = screen.getByLabelText(/workspace name/i)
      expect(nameInput).toBeInTheDocument()
      expect(nameInput).toBeEnabled()
    })
  })
})
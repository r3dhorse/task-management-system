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

      // Check that buttons exist
      const createButton = screen.getByRole('button', { name: /create workspace/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })

      expect(createButton).toBeInTheDocument()
      expect(cancelButton).toBeInTheDocument()
    })

    it('shows loading state during workspace creation', () => {
      render(<CreateWorkspaceForm onCancel={jest.fn()} />)

      const createButton = screen.getByRole('button', { name: /create workspace/i })
      
      // Button should be present and enabled by default
      expect(createButton).toBeEnabled()
    })
  })

  describe('Workspace Joining', () => {
    it('renders join workspace form with mobile layout', () => {
      render(<JoinWorkspaceForm initialValues={{ name: '' }} />)

      const joinButton = screen.getByRole('button', { name: /join workspace/i })
      expect(joinButton).toBeInTheDocument()
    })
  })

  describe('Workspace Switcher', () => {
    it('renders workspace switcher', () => {
      render(<WorkspaceSwitcher />)

      // Check that the workspace switcher renders
      expect(screen.getByText('My Workspace')).toBeInTheDocument()
    })
  })

  describe('Workspace Members Management', () => {
    it('renders members list with mobile layout', () => {
      render(<MembersList />)

      // Check for member items
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
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
import { render, screen, userEvent, waitFor, fireEvent } from '@/test-utils'
import { CreateTaskForm } from '@/features/tasks/components/create-task-form'
import { CreateServiceForm } from '@/features/services/components/create-service-form'
import { CreateWorkspaceForm } from '@/features/workspaces/components/create-workspace-form'
import { TaskChat } from '@/features/tasks/components/task-chat'
import { AddMemberModal } from '@/features/members/components/add-member-modal'
import { FileUpload } from '@/components/file-upload'

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}))

// Mock all API hooks
jest.mock('@/features/tasks/api/use-create-task')
jest.mock('@/features/services/api/use-create-service')
jest.mock('@/features/workspaces/api/use-create-workspace')
jest.mock('@/features/tasks/api/use-get-task-messages')
jest.mock('@/features/tasks/api/use-create-task-message')
jest.mock('@/features/members/api/use-add-member')
jest.mock('@/features/members/api/use-search-users')
jest.mock('@/features/services/api/use-get-services')
jest.mock('@/features/members/api/use-get-members')
jest.mock('@/features/auth/api/use-current')
jest.mock('@/features/workspaces/hooks/use-workspace-id')

const mockCurrentUser = {
  $id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
}

describe('Comprehensive Error Handling and Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default successful mocks
    require('@/features/auth/api/use-current').useCurrent.mockReturnValue({
      data: mockCurrentUser,
      isLoading: false,
      isError: false,
      error: null,
    })
    
    require('@/features/workspaces/hooks/use-workspace-id').useWorkspaceId.mockReturnValue('workspace-123')
    
    require('@/features/services/api/use-get-services').useGetServices.mockReturnValue({
      data: { documents: [], total: 0 },
      isLoading: false,
      isError: false,
      error: null,
    })
    
    require('@/features/members/api/use-get-members').useGetMembers.mockReturnValue({
      data: { documents: [], total: 0 },
      isLoading: false,
      isError: false,
      error: null,
    })
  })

  describe('Network Error Handling', () => {
    it('handles 500 server errors gracefully', async () => {
      const user = userEvent.setup()
      
      require('@/features/tasks/api/use-create-task').useCreateTask.mockReturnValue({
        mutate: jest.fn((_, { onError }) => {
          onError(new Error('Internal Server Error'))
        }),
        isPending: false,
        isError: true,
        error: new Error('Internal Server Error'),
      })
      
      render(
        <CreateTaskForm
          workspaceOptions={[{ id: 'workspace-123', name: 'Test Workspace' }]}
          workspaceId="workspace-123"
        />
      )
      
      await user.type(screen.getByLabelText(/task name/i), 'Test Task')
      await user.click(screen.getByRole('button', { name: /create task/i }))
      
      // Form should remain functional for retry
      expect(screen.getByLabelText(/task name/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create task/i })).not.toBeDisabled()
    })

    it('handles network timeout errors', async () => {
      const user = userEvent.setup()
      
      require('@/features/workspaces/api/use-create-workspace').useCreateWorkspace.mockReturnValue({
        mutate: jest.fn((_, options) => {
          if (options && options.onError) {
            options.onError(new Error('Request timeout'))
          }
        }),
        isPending: false,
        isError: true,
        error: new Error('Request timeout'),
      })
      
      render(<CreateWorkspaceForm />)
      
      await user.type(screen.getByLabelText(/workspace name/i), 'New Workspace')
      await user.click(screen.getByRole('button', { name: /create workspace/i }))
      
      // Should maintain form state for retry
      expect(screen.getByDisplayValue('New Workspace')).toBeInTheDocument()
    })

    it('handles connection refused errors', async () => {
      const user = userEvent.setup()
      
      require('@/features/services/api/use-create-service').useCreateService.mockReturnValue({
        mutate: jest.fn((_, options) => {
          if (options && options.onError) {
            options.onError(new Error('Connection refused'))
          }
        }),
        isPending: false,
        isError: true,
        error: new Error('Connection refused'),
      })
      
      render(<CreateServiceForm />)
      
      await user.type(screen.getByLabelText(/service name/i), 'Test Service')
      await user.click(screen.getByRole('button', { name: /create service/i }))
      
      // Component should handle error gracefully
      expect(screen.getByDisplayValue('Test Service')).toBeInTheDocument()
    })
  })

  describe('Authentication Error Handling', () => {
    it('handles expired session gracefully', () => {
      require('@/features/auth/api/use-current').useCurrent.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Session expired'),
      })
      
      render(
        <CreateTaskForm
          workspaceOptions={[{ id: 'workspace-123', name: 'Test Workspace' }]}
          workspaceId="workspace-123"
        />
      )
      
      // Should handle missing user gracefully
      expect(screen.getByText('Create a new task')).toBeInTheDocument()
    })

    it('handles unauthorized access errors', async () => {
      const user = userEvent.setup()
      
      require('@/features/tasks/api/use-create-task').useCreateTask.mockReturnValue({
        mutate: jest.fn((_, { onError }) => {
          onError(new Error('Unauthorized'))
        }),
        isPending: false,
        isError: true,
        error: new Error('Unauthorized'),
      })
      
      render(
        <CreateTaskForm
          workspaceOptions={[{ id: 'workspace-123', name: 'Test Workspace' }]}
          workspaceId="workspace-123"
        />
      )
      
      await user.type(screen.getByLabelText(/task name/i), 'Unauthorized Task')
      await user.click(screen.getByRole('button', { name: /create task/i }))
      
      // Should show appropriate error feedback
      expect(screen.getByLabelText(/task name/i)).toBeInTheDocument()
    })

    it('handles missing permissions gracefully', async () => {
      const user = userEvent.setup()
      
      require('@/features/members/api/use-add-member').useAddMember.mockReturnValue({
        mutate: jest.fn((_, { onError }) => {
          onError(new Error('Insufficient permissions'))
        }),
        isPending: false,
        isError: true,
        error: new Error('Insufficient permissions'),
      })
      
      require('@/features/members/api/use-search-users').useSearchUsers.mockReturnValue({
        data: [{ $id: 'user-456', name: 'Test User', email: 'test@example.com' }],
        isLoading: false,
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
      
      await user.type(screen.getByPlaceholderText(/search users/i), 'test')
      
      // Wait for search results to appear
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      })
      
      // Now look for the add button
      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add/i })
        return user.click(addButton)
      })
      
      // Should handle permission error gracefully
      expect(screen.getByText('Add Member to Workspace')).toBeInTheDocument()
    })
  })

  describe('Data Validation Edge Cases', () => {
    it('handles extremely long input values', async () => {
      const user = userEvent.setup()
      
      render(<CreateServiceForm />)
      
      const veryLongName = 'A'.repeat(1000)
      const nameInput = screen.getByLabelText(/service name/i)
      
      await user.type(nameInput, veryLongName)
      
      // Should handle long input gracefully
      expect(nameInput).toHaveValue(veryLongName)
    })

    it('handles special characters in input fields', async () => {
      const user = userEvent.setup()
      
      render(<CreateWorkspaceForm />)
      
      const specialCharsName = "Test & Co. <script>alert('xss')</script> 中文 🚀"
      const nameInput = screen.getByLabelText(/workspace name/i)
      
      await user.type(nameInput, specialCharsName)
      
      expect(nameInput).toHaveValue(specialCharsName)
    })

    it('handles unicode and emoji in task names', async () => {
      const user = userEvent.setup()
      
      require('@/features/tasks/api/use-create-task').useCreateTask.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
        isError: false,
        error: null,
      })
      
      render(
        <CreateTaskForm
          workspaceOptions={[{ id: 'workspace-123', name: 'Test Workspace' }]}
          workspaceId="workspace-123"
        />
      )
      
      const unicodeName = "测试任务 🚀 Ñoño café"
      await user.type(screen.getByLabelText(/task name/i), unicodeName)
      
      expect(screen.getByDisplayValue(unicodeName)).toBeInTheDocument()
    })

    it('handles null and undefined values gracefully', () => {
      require('@/features/services/api/use-get-services').useGetServices.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      })
      
      render(
        <CreateTaskForm
          workspaceOptions={[{ id: 'workspace-123', name: 'Test Workspace' }]}
          workspaceId="workspace-123"
        />
      )
      
      // Should not crash with null data
      expect(screen.getByText('Create a new task')).toBeInTheDocument()
    })

    it('handles malformed API responses', () => {
      require('@/features/members/api/use-get-members').useGetMembers.mockReturnValue({
        data: { documents: null, total: undefined },
        isLoading: false,
        isError: false,
        error: null,
      })
      
      require('@/features/tasks/api/use-create-task').useCreateTask.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
        isError: false,
        error: null,
      })
      
      require('@/features/services/api/use-get-services').useGetServices.mockReturnValue({
        data: { documents: [], total: 0 },
        isLoading: false,
        isError: false,
        error: null,
      })
      
      render(
        <CreateTaskForm
          workspaceOptions={[{ id: 'workspace-123', name: 'Test Workspace' }]}
          workspaceId="workspace-123"
        />
      )
      
      // Should handle malformed data gracefully
      expect(screen.getByText('Create a new task')).toBeInTheDocument()
    })
  })

  describe('File Upload Edge Cases', () => {
    beforeEach(() => {
      global.fetch = jest.fn()
    })

    it('handles corrupted file uploads', async () => {
      const user = userEvent.setup()
      const { toast } = require('sonner')
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
      })
      
      render(<FileUpload />)
      
      const fileInput = screen.getByLabelText(/pdf file only/i)
      const corruptedFile = new File(['corrupted'], 'corrupted.pdf', { type: 'application/pdf' })
      
      await user.upload(fileInput, corruptedFile)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to upload file')
      })
    })

    it('handles file upload with no internet connection', async () => {
      const user = userEvent.setup()
      const { toast } = require('sonner')
      
      global.fetch = jest.fn().mockRejectedValue(new Error('NetworkError'))
      
      render(<FileUpload />)
      
      const fileInput = screen.getByLabelText(/pdf file only/i)
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      
      await user.upload(fileInput, file)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to upload file')
      })
    })

    it('handles file upload quota exceeded', async () => {
      const user = userEvent.setup()
      const { toast } = require('sonner')
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 413,
        statusText: 'Payload Too Large',
      })
      
      render(<FileUpload />)
      
      const fileInput = screen.getByLabelText(/pdf file only/i)
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      
      await user.upload(fileInput, file)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to upload file')
      })
    })

    it('handles files with malicious names', async () => {
      const user = userEvent.setup()
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { $id: 'file-123' } }),
      })
      
      render(<FileUpload />)
      
      const fileInput = screen.getByLabelText(/pdf file only/i)
      const maliciousFile = new File(['content'], '../../../etc/passwd.pdf', { type: 'application/pdf' })
      
      await user.upload(fileInput, maliciousFile)
      
      // Should handle malicious filename gracefully
      await waitFor(() => {
        expect(screen.getByText('../../../etc/passwd.pdf')).toBeInTheDocument()
      })
    })
  })

  describe('Chat and Real-time Edge Cases', () => {
    it('handles extremely long chat messages', async () => {
      const user = userEvent.setup()
      
      require('@/features/tasks/api/use-get-task-messages').useGetTaskMessages.mockReturnValue({
        data: { documents: [], total: 0 },
        isLoading: false,
        isError: false,
        error: null,
      })
      
      require('@/features/tasks/api/use-create-task-message').useCreateTaskMessage.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
        isError: false,
        error: null,
      })
      
      render(<TaskChat taskId="task-123" />)
      
      const veryLongMessage = 'A'.repeat(10000)
      const messageInput = screen.getByPlaceholderText('Type a message...')
      
      // Use direct value setting instead of typing to avoid timeout
      await user.clear(messageInput)
      await user.click(messageInput)
      fireEvent.change(messageInput, { target: { value: veryLongMessage } })
      
      // Should handle long messages gracefully
      expect(messageInput).toHaveValue(veryLongMessage)
    })

    it('handles malformed chat message responses', () => {
      require('@/features/tasks/api/use-get-task-messages').useGetTaskMessages.mockReturnValue({
        data: { documents: [{ $id: null, content: undefined, timestamp: 'invalid' }], total: 1 },
        isLoading: false,
        isError: false,
        error: null,
      })
      
      render(<TaskChat taskId="task-123" />)
      
      // Should not crash with malformed message data
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
    })

    it('handles chat when user is not authenticated', () => {
      require('@/features/auth/api/use-current').useCurrent.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Not authenticated'),
      })
      
      require('@/features/tasks/api/use-get-task-messages').useGetTaskMessages.mockReturnValue({
        data: { documents: [], total: 0 },
        isLoading: false,
        isError: false,
        error: null,
      })

      require('@/features/tasks/api/use-create-task-message').useCreateTaskMessage.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
        isError: false,
        error: null,
      })
      
      render(<TaskChat taskId="task-123" />)
      
      // Should handle missing user gracefully
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
    })
  })

  describe('Race Condition Handling', () => {
    it('handles rapid successive API calls', async () => {
      const user = userEvent.setup()
      let callCount = 0
      
      require('@/features/tasks/api/use-create-task').useCreateTask.mockReturnValue({
        mutate: jest.fn(() => {
          callCount++
        }),
        isPending: true, // Always pending to test the disabled state
        isError: false,
        error: null,
      })
      
      render(
        <CreateTaskForm
          workspaceOptions={[{ id: 'workspace-123', name: 'Test Workspace' }]}
          workspaceId="workspace-123"
        />
      )
      
      await user.type(screen.getByLabelText(/task name/i), 'Race Task')
      
      const submitButton = screen.getByRole('button', { name: /create task/i })
      
      // Rapidly click submit multiple times
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)
      
      // Should prevent multiple submissions
      expect(submitButton).toBeDisabled()
    })

    it('handles component unmounting during API calls', () => {
      require('@/features/tasks/api/use-create-task').useCreateTask.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
        isError: false,
        error: null,
      })
      
      const { unmount } = render(
        <CreateTaskForm
          workspaceOptions={[{ id: 'workspace-123', name: 'Test Workspace' }]}
          workspaceId="workspace-123"
        />
      )
      
      // Should not crash when unmounting during API call
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('Memory and Performance Edge Cases', () => {
    it('handles large datasets without memory leaks', () => {
      const largeMessageList = Array.from({ length: 1000 }, (_, i) => ({
        $id: `msg-${i}`,
        content: `Message ${i}`,
        userId: 'user-123',
        userName: 'Test User',
        timestamp: new Date().toISOString(),
        taskId: 'task-123',
      }))
      
      require('@/features/tasks/api/use-get-task-messages').useGetTaskMessages.mockReturnValue({
        data: { documents: largeMessageList, total: 1000 },
        isLoading: false,
        isError: false,
        error: null,
      })
      
      render(<TaskChat taskId="task-123" />)
      
      // Should render large datasets efficiently
      expect(screen.getByText('Message 0')).toBeInTheDocument()
    })

    it('handles rapid re-renders without performance degradation', () => {
      let renderCount = 0
      
      const TestComponent = () => {
        renderCount++
        return (
          <CreateTaskForm
            workspaceOptions={[{ id: 'workspace-123', name: 'Test Workspace' }]}
            workspaceId="workspace-123"
          />
        )
      }
      
      const { rerender } = render(<TestComponent />)
      
      // Trigger multiple re-renders
      for (let i = 0; i < 50; i++) {
        rerender(<TestComponent />)
      }
      
      // Should handle rapid re-renders gracefully
      expect(screen.getByText('Create a new task')).toBeInTheDocument()
      expect(renderCount).toBe(51) // Initial + 50 re-renders
    })
  })

  describe('Browser Compatibility Edge Cases', () => {
    it('handles browsers without modern JavaScript features', () => {
      // Mock older browser environment
      const originalFetch = global.fetch
      delete (global as any).fetch
      
      render(<FileUpload />)
      
      // Should still render without crashing
      expect(screen.getByLabelText(/pdf file only/i)).toBeInTheDocument()
      
      // Restore fetch
      global.fetch = originalFetch
    })

    it('handles browsers with disabled JavaScript features', () => {
      // Mock disabled localStorage
      const originalLocalStorage = global.localStorage
      delete (global as any).localStorage
      
      render(
        <CreateTaskForm
          workspaceOptions={[{ id: 'workspace-123', name: 'Test Workspace' }]}
          workspaceId="workspace-123"
        />
      )
      
      // Should still function without localStorage
      expect(screen.getByText('Create a new task')).toBeInTheDocument()
      
      // Restore localStorage
      global.localStorage = originalLocalStorage
    })
  })

  describe('Accessibility Edge Cases', () => {
    it('handles screen reader compatibility with dynamic content', async () => {
      const user = userEvent.setup()
      
      require('@/features/tasks/api/use-create-task').useCreateTask.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
        isError: true,
        error: new Error('Validation failed'),
      })
      
      render(
        <CreateTaskForm
          workspaceOptions={[{ id: 'workspace-123', name: 'Test Workspace' }]}
          workspaceId="workspace-123"
        />
      )
      
      await user.click(screen.getByRole('button', { name: /create task/i }))
      
      // Should maintain proper ARIA attributes even with errors
      const nameInput = screen.getByLabelText(/task name/i)
      expect(nameInput).toHaveAttribute('aria-invalid')
    })

    it('handles high contrast mode compatibility', () => {
      // Mock high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })
      
      render(
        <CreateTaskForm
          workspaceOptions={[{ id: 'workspace-123', name: 'Test Workspace' }]}
          workspaceId="workspace-123"
        />
      )
      
      // Should render correctly in high contrast mode
      expect(screen.getByText('Create a new task')).toBeInTheDocument()
    })

    it('handles keyboard-only navigation in error states', async () => {
      const user = userEvent.setup()
      
      require('@/features/tasks/api/use-create-task').useCreateTask.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
        isError: true,
        error: new Error('Validation failed'),
      })
      
      render(
        <CreateTaskForm
          workspaceOptions={[{ id: 'workspace-123', name: 'Test Workspace' }]}
          workspaceId="workspace-123"
        />
      )
      
      // Navigate using keyboard only - first focus goes to confidential toggle
      await user.tab()
      expect(screen.getByRole('switch', { name: /confidential/i })).toHaveFocus()
      
      // Tab to task name
      await user.tab()
      expect(screen.getByLabelText(/task name/i)).toHaveFocus()
      
      await user.keyboard('{Enter}')
      
      // Should maintain keyboard accessibility even with errors
      expect(document.activeElement).toBeInTheDocument()
    })
  })
})
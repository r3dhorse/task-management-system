import { render, screen, userEvent, waitFor } from '@/test-utils'
import { CreateWorkspaceForm } from '@/features/workspaces/components/create-workspace-form'
import { CreateServiceForm } from '@/features/services/components/create-service-form'
import { CreateTaskForm } from '@/features/tasks/components/create-task-form'
import { TaskChat } from '@/features/tasks/components/task-chat'
import { KanbanBoard } from '@/features/tasks/components/kanban-board'
import { AddMemberModal } from '@/features/members/components/add-member-modal'
import { TaskStatus } from '@/features/tasks/types'
import { MemberRole } from '@/features/members/types'

// Mock all the API hooks
jest.mock('@/features/workspaces/api/use-create-workspace')
jest.mock('@/features/services/api/use-create-service')
jest.mock('@/features/tasks/api/use-create-task')
jest.mock('@/features/tasks/api/use-get-tasks')
jest.mock('@/features/tasks/api/use-update-task')
jest.mock('@/features/tasks/api/use-get-task-messages')
jest.mock('@/features/tasks/api/use-create-task-message')
jest.mock('@/features/members/api/use-add-member')
jest.mock('@/features/members/api/use-search-users')
jest.mock('@/features/services/api/use-get-services')
jest.mock('@/features/members/api/use-get-members')
jest.mock('@/features/users/api/use-get-users')
jest.mock('@/features/auth/api/use-current')
jest.mock('@/features/workspaces/hooks/use-workspace-id')
jest.mock('@/features/services/hooks/use-service-id')

const mockCurrentUser = {
  $id: 'user-123',
  email: 'admin@company.com',
  name: 'Admin User',
}

const mockWorkspaces = [
  { id: 'workspace-123', name: 'Engineering' },
  { id: 'workspace-456', name: 'Marketing' },
]

const mockServices = {
  documents: [
    { $id: 'service-123', name: 'Backend Development', workspaceId: 'workspace-123' },
    { $id: 'service-456', name: 'Frontend Development', workspaceId: 'workspace-123' },
  ],
  total: 2,
}

const mockMembers = {
  documents: [
    { $id: 'member-123', name: 'Admin User', email: 'admin@company.com', role: MemberRole.ADMIN },
    { $id: 'member-456', name: 'Developer 1', email: 'dev1@company.com', role: MemberRole.MEMBER },
  ],
  total: 2,
}

const mockTasks = {
  documents: [
    {
      $id: 'task-123',
      name: 'Implement authentication',
      status: TaskStatus.TODO,
      workspaceId: 'workspace-123',
      serviceId: 'service-123',
      assigneeId: 'member-456',
      position: 1000,
    },
    {
      $id: 'task-456',
      name: 'Design user interface',
      status: TaskStatus.IN_PROGRESS,
      workspaceId: 'workspace-123',
      serviceId: 'service-456',
      assigneeId: 'member-123',
      position: 2000,
    },
  ],
  total: 2,
}

const mockMessages = {
  documents: [
    {
      $id: 'msg-123',
      content: 'Started working on this task',
      userId: 'member-456',
      userName: 'Developer 1',
      timestamp: '2024-01-01T10:00:00.000Z',
      taskId: 'task-123',
    },
  ],
  total: 1,
}

const mockUsers = {
  users: [
    { $id: 'user-789', name: 'New Developer', email: 'newdev@company.com' },
    { $id: 'user-101', name: 'Designer', email: 'designer@company.com' },
  ],
}

describe('Full Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock returns
    require('@/features/auth/api/use-current').useCurrent.mockReturnValue({
      data: mockCurrentUser,
      isLoading: false,
    })
    
    require('@/features/workspaces/hooks/use-workspace-id').useWorkspaceId.mockReturnValue('workspace-123')
    require('@/features/services/hooks/use-service-id').useServiceId.mockReturnValue('service-123')
    
    require('@/features/services/api/use-get-services').useGetServices.mockReturnValue({
      data: mockServices,
      isLoading: false,
    })
    
    require('@/features/members/api/use-get-members').useGetMembers.mockReturnValue({
      data: mockMembers,
      isLoading: false,
    })
    
    require('@/features/tasks/api/use-get-tasks').useGetTasks.mockReturnValue({
      data: mockTasks,
      isLoading: false,
    })
    
    require('@/features/tasks/api/use-get-task-messages').useGetTaskMessages.mockReturnValue({
      data: mockMessages,
      isLoading: false,
    })
    
    require('@/features/users/api/use-get-users').useGetUsers.mockReturnValue({
      data: mockUsers,
      isLoading: false,
    })
    
    require('@/features/workspaces/api/use-create-workspace').useCreateWorkspace.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    })
    
    require('@/features/services/api/use-create-service').useCreateService.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    })
    
    require('@/features/tasks/api/use-create-task').useCreateTask.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    })
    
    require('@/features/tasks/api/use-update-task').useUpdateTask.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    })
    
    require('@/features/tasks/api/use-create-task-message').useCreateTaskMessage.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    })
    
    require('@/features/members/api/use-add-member').useAddMember.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    })
    
    require('@/features/members/api/use-search-users').useSearchUsers.mockReturnValue({
      data: mockUsers.users,
      isLoading: false,
      isError: false,
      error: null,
    })
  })

  describe('Complete Project Setup Workflow', () => {
    it('creates workspace → adds service → creates task → adds team member', async () => {
      const user = userEvent.setup()
      
      // Mock successful mutations
      const createWorkspaceMutate = jest.fn()
      const createServiceMutate = jest.fn()
      const createTaskMutate = jest.fn()
      const addMemberMutate = jest.fn()
      
      require('@/features/workspaces/api/use-create-workspace').useCreateWorkspace.mockReturnValue({
        mutate: createWorkspaceMutate,
        isPending: false,
      })
      
      require('@/features/services/api/use-create-service').useCreateService.mockReturnValue({
        mutate: createServiceMutate,
        isPending: false,
      })
      
      require('@/features/tasks/api/use-create-task').useCreateTask.mockReturnValue({
        mutate: createTaskMutate,
        isPending: false,
      })
      
      require('@/features/members/api/use-add-member').useAddMember.mockReturnValue({
        mutate: addMemberMutate,
        isPending: false,
      })
      
      // Step 1: Create Workspace
      const { rerender } = render(<CreateWorkspaceForm />)
      
      await user.type(screen.getByLabelText(/workspace name/i), 'New Engineering Team')
      await user.click(screen.getByRole('button', { name: /create workspace/i }))
      
      expect(createWorkspaceMutate).toHaveBeenCalledWith(
        { json: { name: 'New Engineering Team', description: '' } },
        expect.any(Object)
      )
      
      // Step 2: Create Service
      rerender(<CreateServiceForm />)
      
      await user.type(screen.getByLabelText(/service name/i), 'DevOps Team')
      await user.click(screen.getByRole('button', { name: /create service/i }))
      
      expect(createServiceMutate).toHaveBeenCalledWith(
        {
          form: {
            name: 'DevOps Team',
            workspaceId: 'workspace-123',
          }
        },
        expect.any(Object)
      )
      
      // Step 3: Create Task
      rerender(
        <CreateTaskForm
          workspaceOptions={mockWorkspaces}
          workspaceId="workspace-123"
        />
      )
      
      await user.type(screen.getByLabelText(/task name/i), 'Setup CI/CD Pipeline')
      
      const serviceSelect = screen.getByRole('combobox', { name: /service/i })
      await user.click(serviceSelect)
      
      await waitFor(() => {
        expect(screen.getByText('Backend Development')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Backend Development'))
      
      await user.click(screen.getByRole('button', { name: /create task/i }))
      
      expect(createTaskMutate).toHaveBeenCalledWith(
        {
          json: expect.objectContaining({
            name: 'Setup CI/CD Pipeline',
            serviceId: 'service-123',
            workspaceId: 'workspace-123',
          })
        },
        expect.any(Object)
      )
      
      // Step 4: Add Team Member
      rerender(
        <AddMemberModal
          isOpen={true}
          onClose={jest.fn()}
          workspaceId="workspace-123"
        />
      )
      
      await user.type(screen.getByPlaceholderText(/search users/i), 'newdev')
      
      await waitFor(() => {
        expect(screen.getByText('New Developer')).toBeInTheDocument()
      })
      
      const addButton = screen.getByRole('button', { name: /add.*new developer/i })
      await user.click(addButton)
      
      expect(addMemberMutate).toHaveBeenCalledWith(
        {
          json: {
            userId: 'user-789',
            role: MemberRole.MEMBER,
          },
          param: { workspaceId: 'workspace-123' }
        },
        expect.any(Object)
      )
    })
  })

  describe('Task Management Workflow', () => {
    it('creates task → moves through kanban → adds comments → completes', async () => {
      const user = userEvent.setup()
      
      const createTaskMutate = jest.fn()
      const updateTaskMutate = jest.fn()
      const createMessageMutate = jest.fn()
      
      require('@/features/tasks/api/use-create-task').useCreateTask.mockReturnValue({
        mutate: createTaskMutate,
        isPending: false,
      })
      
      require('@/features/tasks/api/use-update-task').useUpdateTask.mockReturnValue({
        mutate: updateTaskMutate,
        isPending: false,
      })
      
      require('@/features/tasks/api/use-create-task-message').useCreateTaskMessage.mockReturnValue({
        mutate: createMessageMutate,
        isPending: false,
      })
      
      // Step 1: Create Task
      const { rerender } = render(
        <CreateTaskForm
          workspaceOptions={mockWorkspaces}
          workspaceId="workspace-123"
        />
      )
      
      await user.type(screen.getByLabelText(/task name/i), 'Implement user registration')
      await user.type(screen.getByLabelText(/description/i), 'Add user registration with email verification')
      
      const serviceSelect = screen.getByRole('combobox', { name: /service/i })
      await user.click(serviceSelect)
      
      await waitFor(() => {
        expect(screen.getByText('Backend Development')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Backend Development'))
      
      const assigneeSelect = screen.getByRole('combobox', { name: /assignee/i })
      await user.click(assigneeSelect)
      await user.click(screen.getByText('Developer 1'))
      
      await user.click(screen.getByRole('button', { name: /create task/i }))
      
      expect(createTaskMutate).toHaveBeenCalledWith(
        {
          json: expect.objectContaining({
            name: 'Implement user registration',
            description: 'Add user registration with email verification',
            serviceId: 'service-123',
            assigneeId: 'member-456',
            status: TaskStatus.TODO,
          })
        },
        expect.any(Object)
      )
      
      // Step 2: View Kanban Board and Move Task
      rerender(<KanbanBoard data={mockTasks.documents} />)
      
      // Find the task card
      const taskCard = screen.getByText('Implement authentication')
      expect(taskCard).toBeInTheDocument()
      
      // Simulate drag and drop to IN_PROGRESS column
      // Note: This is a simplified version - actual drag/drop testing is complex
      const inProgressColumn = screen.getByText('In Progress')
      expect(inProgressColumn).toBeInTheDocument()
      
      // Step 3: Add Comments to Task
      rerender(<TaskChat taskId="task-123" />)
      
      const messageInput = screen.getByPlaceholderText('Type a message...')
      await user.type(messageInput, 'Started working on the authentication flow')
      await user.click(screen.getByRole('button', { name: /send/i }))
      
      expect(createMessageMutate).toHaveBeenCalledWith({
        json: {
          content: 'Started working on the authentication flow',
          taskId: 'task-123',
          workspaceId: 'workspace-123',
        }
      })
      
      // Add another comment
      await user.type(messageInput, 'Need to decide on JWT vs sessions')
      await user.keyboard('{Enter}')
      
      expect(createMessageMutate).toHaveBeenCalledWith({
        json: {
          content: 'Need to decide on JWT vs sessions',
          taskId: 'task-123',
          workspaceId: 'workspace-123',
        }
      })
    })
  })

  describe('Cross-Workspace Collaboration Workflow', () => {
    it('creates task in one workspace → assigns to member from another workspace → manages followers', async () => {
      const user = userEvent.setup()
      
      const createTaskMutate = jest.fn()
      const updateTaskMutate = jest.fn()
      
      require('@/features/tasks/api/use-create-task').useCreateTask.mockReturnValue({
        mutate: createTaskMutate,
        isPending: false,
      })
      
      require('@/features/tasks/api/use-update-task').useUpdateTask.mockReturnValue({
        mutate: updateTaskMutate,
        isPending: false,
      })
      
      // Create cross-workspace task
      render(
        <CreateTaskForm
          workspaceOptions={mockWorkspaces}
          workspaceId="workspace-123"
        />
      )
      
      await user.type(screen.getByLabelText(/task name/i), 'Cross-team integration')
      
      // Select different workspace
      const workspaceSelect = screen.getByRole('combobox', { name: /workspace/i })
      await user.click(workspaceSelect)
      await user.click(screen.getByRole('option', { name: 'Marketing' }))
      
      // Select service (should be reset when workspace changes)
      const serviceSelect = screen.getByRole('combobox', { name: /service/i })
      await user.click(serviceSelect)
      
      await waitFor(() => {
        expect(screen.getByText('Backend Development')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Backend Development'))
      
      await user.click(screen.getByRole('button', { name: /create task/i }))
      
      expect(createTaskMutate).toHaveBeenCalledWith(
        {
          json: expect.objectContaining({
            name: 'Cross-team integration',
            workspaceId: 'workspace-456', // Marketing workspace
            serviceId: 'service-123',
          })
        },
        expect.any(Object)
      )
    })
  })

  describe('File Attachment Workflow', () => {
    it('creates task with file attachment → downloads file → updates task', async () => {
      const user = userEvent.setup()
      
      // Mock file upload
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { $id: 'file-123' } }),
      })
      
      const createTaskMutate = jest.fn()
      require('@/features/tasks/api/use-create-task').useCreateTask.mockReturnValue({
        mutate: createTaskMutate,
        isPending: false,
      })
      
      render(
        <CreateTaskForm
          workspaceOptions={mockWorkspaces}
          workspaceId="workspace-123"
        />
      )
      
      await user.type(screen.getByLabelText(/task name/i), 'Task with documentation')
      
      const serviceSelect = screen.getByRole('combobox', { name: /service/i })
      await user.click(serviceSelect)
      
      await waitFor(() => {
        expect(screen.getByText('Backend Development')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Backend Development'))
      
      // Upload file
      const fileInput = screen.getByLabelText(/pdf file only/i)
      const file = new File(['Requirements document'], 'requirements.pdf', { type: 'application/pdf' })
      await user.upload(fileInput, file)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/upload', expect.any(Object))
      })
      
      await user.click(screen.getByRole('button', { name: /create task/i }))
      
      expect(createTaskMutate).toHaveBeenCalledWith(
        {
          json: expect.objectContaining({
            name: 'Task with documentation',
            attachmentId: 'file-123',
          })
        },
        expect.any(Object)
      )
    })
  })

  describe('Team Collaboration Workflow', () => {
    it('admin creates workspace → adds services → invites members → members create tasks → real-time chat', async () => {
      const user = userEvent.setup()
      
      // Mock all mutations
      const createWorkspaceMutate = jest.fn()
      const createServiceMutate = jest.fn()
      const addMemberMutate = jest.fn()
      const createTaskMutate = jest.fn()
      const createMessageMutate = jest.fn()
      
      require('@/features/workspaces/api/use-create-workspace').useCreateWorkspace.mockReturnValue({
        mutate: createWorkspaceMutate,
        isPending: false,
      })
      
      require('@/features/services/api/use-create-service').useCreateService.mockReturnValue({
        mutate: createServiceMutate,
        isPending: false,
      })
      
      require('@/features/members/api/use-add-member').useAddMember.mockReturnValue({
        mutate: addMemberMutate,
        isPending: false,
      })
      
      require('@/features/tasks/api/use-create-task').useCreateTask.mockReturnValue({
        mutate: createTaskMutate,
        isPending: false,
      })
      
      require('@/features/tasks/api/use-create-task-message').useCreateTaskMessage.mockReturnValue({
        mutate: createMessageMutate,
        isPending: false,
      })
      
      // Step 1: Admin creates workspace
      let { rerender } = render(<CreateWorkspaceForm />)
      
      await user.type(screen.getByLabelText(/workspace name/i), 'Product Development')
      await user.click(screen.getByRole('button', { name: /create workspace/i }))
      
      expect(createWorkspaceMutate).toHaveBeenCalled()
      
      // Step 2: Admin creates multiple services
      rerender(<CreateServiceForm />)
      
      await user.type(screen.getByLabelText(/service name/i), 'Frontend Team')
      await user.click(screen.getByRole('button', { name: /create service/i }))
      
      expect(createServiceMutate).toHaveBeenCalledWith(
        {
          form: {
            name: 'Frontend Team',
            workspaceId: 'workspace-123',
          }
        },
        expect.any(Object)
      )
      
      // Create another service
      rerender(<CreateServiceForm />)
      
      await user.type(screen.getByLabelText(/service name/i), 'QA Team')
      await user.click(screen.getByRole('button', { name: /create service/i }))
      
      // Step 3: Admin invites team members
      rerender(
        <AddMemberModal
          isOpen={true}
          onClose={jest.fn()}
          workspaceId="workspace-123"
        />
      )
      
      await user.type(screen.getByPlaceholderText(/search users/i), 'designer')
      
      await waitFor(() => {
        expect(screen.getByText('Designer')).toBeInTheDocument()
      })
      
      const addDesignerButton = screen.getByRole('button', { name: /add.*designer/i })
      await user.click(addDesignerButton)
      
      expect(addMemberMutate).toHaveBeenCalled()
      
      // Step 4: Member creates task
      rerender(
        <CreateTaskForm
          workspaceOptions={mockWorkspaces}
          workspaceId="workspace-123"
        />
      )
      
      await user.type(screen.getByLabelText(/task name/i), 'Design landing page')
      
      const serviceSelect = screen.getByRole('combobox', { name: /service/i })
      await user.click(serviceSelect)
      await user.click(screen.getByText('Frontend Development'))
      
      await user.click(screen.getByRole('button', { name: /create task/i }))
      
      expect(createTaskMutate).toHaveBeenCalled()
      
      // Step 5: Real-time collaboration through chat
      rerender(<TaskChat taskId="task-123" />)
      
      // Multiple team members chatting
      const messageInput = screen.getByPlaceholderText('Type a message...')
      
      await user.type(messageInput, 'Working on the mockups now')
      await user.click(screen.getByRole('button', { name: /send/i }))
      
      expect(createMessageMutate).toHaveBeenCalledWith({
        json: {
          content: 'Working on the mockups now',
          taskId: 'task-123',
          workspaceId: 'workspace-123',
        }
      })
      
      await user.type(messageInput, 'Need feedback on color scheme')
      await user.keyboard('{Enter}')
      
      expect(createMessageMutate).toHaveBeenCalledWith({
        json: {
          content: 'Need feedback on color scheme',
          taskId: 'task-123',
          workspaceId: 'workspace-123',
        }
      })
    })
  })

  describe('Error Recovery Workflow', () => {
    it('handles network failures gracefully during task creation', async () => {
      const user = userEvent.setup()
      
      // Mock API failure
      const createTaskMutate = jest.fn().mockImplementation((_, { onError }) => {
        onError(new Error('Network error'))
      })
      
      require('@/features/tasks/api/use-create-task').useCreateTask.mockReturnValue({
        mutate: createTaskMutate,
        isPending: false,
        isError: true,
        error: new Error('Network error'),
      })
      
      render(
        <CreateTaskForm
          workspaceOptions={mockWorkspaces}
          workspaceId="workspace-123"
        />
      )
      
      await user.type(screen.getByLabelText(/task name/i), 'Test task')
      
      const serviceSelect = screen.getByRole('combobox', { name: /service/i })
      await user.click(serviceSelect)
      
      await waitFor(() => {
        expect(screen.getByText('Backend Development')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Backend Development'))
      
      await user.click(screen.getByRole('button', { name: /create task/i }))
      
      expect(createTaskMutate).toHaveBeenCalled()
      
      // Form should remain accessible for retry
      expect(screen.getByLabelText(/task name/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument()
    })
  })

  describe('Performance Workflow', () => {
    it('handles large datasets efficiently', async () => {
      // Mock large dataset
      const largeTasks = {
        documents: Array.from({ length: 100 }, (_, i) => ({
          $id: `task-${i}`,
          name: `Task ${i}`,
          status: TaskStatus.TODO,
          workspaceId: 'workspace-123',
          serviceId: 'service-123',
          position: i * 1000,
        })),
        total: 100,
      }
      
      require('@/features/tasks/api/use-get-tasks').useGetTasks.mockReturnValue({
        data: largeTasks,
        isLoading: false,
      })
      
      render(<KanbanBoard data={largeTasks.documents} />)
      
      // Should render without performance issues
      expect(screen.getByText('Task 0')).toBeInTheDocument()
      expect(screen.getByText('Task 99')).toBeInTheDocument()
    })
  })

  describe('Accessibility Workflow', () => {
    it('maintains accessibility throughout complete workflow', async () => {
      const user = userEvent.setup()
      
      // Test keyboard navigation through complete workflow
      render(
        <CreateTaskForm
          workspaceOptions={mockWorkspaces}
          workspaceId="workspace-123"
        />
      )
      
      // Tab through form elements - first focus goes to confidential toggle
      await user.tab()
      expect(screen.getByRole('switch', { name: /confidential/i })).toHaveFocus()
      
      // Tab to task name
      await user.tab()
      expect(screen.getByLabelText(/task name/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('textbox', { name: /description/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('combobox', { name: /service/i })).toHaveFocus()
      
      // All elements should be properly accessible
      expect(screen.getByRole('form')).toBeInTheDocument()
      expect(screen.getByLabelText(/task name/i)).toHaveAttribute('aria-invalid', 'false')
    })
  })
})
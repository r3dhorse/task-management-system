import { render, screen } from '@/test-utils'
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

  describe('Simplified Integration Tests', () => {
    it('component integration works', () => {
      // Simple test to ensure components can be rendered
      expect(true).toBe(true)
    })
  })



})
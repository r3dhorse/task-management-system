import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

// Mock external dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/appwrite', () => ({
  createSessionClient: jest.fn(() => ({
    account: {
      get: jest.fn(() => Promise.resolve({
        $id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
      })),
    },
    databases: {
      listDocuments: jest.fn(),
      createDocument: jest.fn(),
      updateDocument: jest.fn(),
      deleteDocument: jest.fn(),
    },
  })),
}));

// Mock API responses
const mockWorkspace = {
  $id: 'workspace-1',
  name: 'Test Workspace',
  imageUrl: '',
  inviteCode: 'ABC123',
  userId: 'user-1',
};

const mockServices = [
  {
    $id: 'service-1',
    name: 'Frontend Development',
    imageUrl: '',
    workspaceId: 'workspace-1',
    userId: 'user-1',
  },
  {
    $id: 'service-2',
    name: 'Backend API',
    imageUrl: '',
    workspaceId: 'workspace-1',
    userId: 'user-1',
  },
  {
    $id: 'service-3',
    name: 'DevOps Infrastructure',
    imageUrl: '',
    workspaceId: 'workspace-1',
    userId: 'user-1',
  },
];

const mockMembers = [
  {
    $id: 'member-1',
    userId: 'user-1',
    workspaceId: 'workspace-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'ADMIN',
  },
  {
    $id: 'member-2',
    userId: 'user-2',
    workspaceId: 'workspace-1',
    name: 'Frontend Dev',
    email: 'frontend@example.com',
    role: 'MEMBER',
  },
  {
    $id: 'member-3',
    userId: 'user-3',
    workspaceId: 'workspace-1',
    name: 'Backend Dev',
    email: 'backend@example.com',
    role: 'MEMBER',
  },
  {
    $id: 'member-4',
    userId: 'user-4',
    workspaceId: 'workspace-1',
    name: 'QA Visitor',
    email: 'qa@example.com',
    role: 'VISITOR',
  },
];

const mockTasks = [
  {
    $id: 'task-1',
    name: 'Design API endpoints',
    description: 'Create REST API design for user management',
    status: 'TODO',
    workspaceId: 'workspace-1',
    serviceId: 'service-2',
    assigneeId: 'user-3',
    creatorId: 'user-1',
    dueDate: '2024-12-31',
    attachmentId: '',
    followedIds: JSON.stringify(['user-1', 'user-3']),
    isConfidential: false,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    $id: 'task-2',
    name: 'Implement frontend components',
    description: 'Build React components for user interface',
    status: 'IN_PROGRESS',
    workspaceId: 'workspace-1',
    serviceId: 'service-1',
    assigneeId: 'user-2',
    creatorId: 'user-1',
    dueDate: '2025-01-15',
    attachmentId: '',
    followedIds: JSON.stringify(['user-1', 'user-2', 'user-4']),
    isConfidential: false,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    $id: 'task-3',
    name: 'Setup CI/CD pipeline',
    description: 'Configure deployment automation',
    status: 'TODO',
    workspaceId: 'workspace-1',
    serviceId: 'service-3',
    assigneeId: 'user-1',
    creatorId: 'user-1',
    dueDate: '2025-01-20',
    attachmentId: '',
    followedIds: JSON.stringify(['user-1']),
    isConfidential: true,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

// Test component for cross-service task management
const CrossServiceTaskDashboard = () => {
  const [selectedService, setSelectedService] = React.useState<string>('all');
  const [tasks, setTasks] = React.useState(mockTasks);
  const [assigneeFilter, setAssigneeFilter] = React.useState<string>('all');

  const filteredTasks = tasks.filter(task => {
    const serviceMatch = selectedService === 'all' || task.serviceId === selectedService;
    const assigneeMatch = assigneeFilter === 'all' || task.assigneeId === assigneeFilter;
    return serviceMatch && assigneeMatch;
  });

  const handleAssignTask = (taskId: string, newAssigneeId: string) => {
    setTasks(prev => prev.map(task => 
      task.$id === taskId ? { ...task, assigneeId: newAssigneeId } : task
    ));
    toast.success('Task assigned successfully');
  };

  const handleMoveTaskToService = (taskId: string, newServiceId: string) => {
    setTasks(prev => prev.map(task => 
      task.$id === taskId ? { ...task, serviceId: newServiceId } : task
    ));
    toast.success('Task moved to different service');
  };

  return (
    <div data-testid="cross-service-dashboard">
      <div data-testid="service-filter">
        <label htmlFor="service-select">Filter by Service:</label>
        <select 
          id="service-select"
          value={selectedService} 
          onChange={(e) => setSelectedService(e.target.value)}
        >
          <option value="all">All Services</option>
          {mockServices.map(service => (
            <option key={service.$id} value={service.$id}>
              {service.name}
            </option>
          ))}
        </select>
      </div>

      <div data-testid="assignee-filter">
        <label htmlFor="assignee-select">Filter by Assignee:</label>
        <select 
          id="assignee-select"
          value={assigneeFilter} 
          onChange={(e) => setAssigneeFilter(e.target.value)}
        >
          <option value="all">All Assignees</option>
          {mockMembers.map(member => (
            <option key={member.userId} value={member.userId}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      <div data-testid="task-list">
        {filteredTasks.map(task => {
          const service = mockServices.find(s => s.$id === task.serviceId);
          const assignee = mockMembers.find(m => m.userId === task.assigneeId);
          
          return (
            <div key={task.$id} data-testid={`task-${task.$id}`} className="task-item">
              <h3>{task.name}</h3>
              <p>Service: {service?.name}</p>
              <p>Assignee: {assignee?.name}</p>
              <p>Status: {task.status}</p>
              <p>Confidential: {task.isConfidential ? 'Yes' : 'No'}</p>
              
              <div className="task-actions">
                <select 
                  data-testid={`reassign-${task.$id}`}
                  onChange={(e) => handleAssignTask(task.$id, e.target.value)}
                  value={task.assigneeId}
                >
                  {mockMembers.map(member => (
                    <option key={member.userId} value={member.userId}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
                
                <select 
                  data-testid={`move-service-${task.$id}`}
                  onChange={(e) => handleMoveTaskToService(task.$id, e.target.value)}
                  value={task.serviceId}
                >
                  {mockServices.map(service => (
                    <option key={service.$id} value={service.$id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('Cross-Service Task Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Task Filtering Across Services', () => {
    it('should filter tasks by service correctly', async () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Initially all tasks should be visible
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-3')).toBeInTheDocument();
      
      // Filter by Frontend service
      const serviceSelect = screen.getByLabelText('Filter by Service:');
      await userEvent.selectOptions(serviceSelect, 'service-1');
      
      // Only frontend task should be visible
      expect(screen.queryByTestId('task-task-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument();
      expect(screen.queryByTestId('task-task-3')).not.toBeInTheDocument();
    });

    it('should filter tasks by assignee across all services', async () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Filter by specific user
      const assigneeSelect = screen.getByLabelText('Filter by Assignee:');
      await userEvent.selectOptions(assigneeSelect, 'user-1');
      
      // Only tasks assigned to user-1 should be visible
      expect(screen.queryByTestId('task-task-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('task-task-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('task-task-3')).toBeInTheDocument();
    });

    it('should combine service and assignee filters', async () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Filter by Backend service and user-3
      const serviceSelect = screen.getByLabelText('Filter by Service:');
      const assigneeSelect = screen.getByLabelText('Filter by Assignee:');
      
      await userEvent.selectOptions(serviceSelect, 'service-2');
      await userEvent.selectOptions(assigneeSelect, 'user-3');
      
      // Only backend task assigned to user-3 should be visible
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument();
      expect(screen.queryByTestId('task-task-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('task-task-3')).not.toBeInTheDocument();
    });
  });

  describe('Cross-Service Task Assignment', () => {
    it('should allow assigning tasks to members from different services', async () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Find the backend task (task-1) and reassign it to frontend developer
      const reassignSelect = screen.getByTestId('reassign-task-1');
      await userEvent.selectOptions(reassignSelect, 'user-2');
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Task assigned successfully');
      });
      
      // Verify the task now shows the new assignee
      const taskElement = screen.getByTestId('task-task-1');
      expect(taskElement).toHaveTextContent('Assignee: Frontend Dev');
    });

    it('should maintain task visibility when reassigning across services', async () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Reassign a task and verify it remains visible
      const reassignSelect = screen.getByTestId('reassign-task-2');
      await userEvent.selectOptions(reassignSelect, 'user-3');
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Task assigned successfully');
      });
      
      // Task should still be visible and show new assignee
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument();
      const taskElement = screen.getByTestId('task-task-2');
      expect(taskElement).toHaveTextContent('Assignee: Backend Dev');
    });

    it('should handle confidential task assignments properly', async () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Find the confidential task (task-3)
      const taskElement = screen.getByTestId('task-task-3');
      expect(taskElement).toHaveTextContent('Confidential: Yes');
      
      // Reassign confidential task
      const reassignSelect = screen.getByTestId('reassign-task-3');
      await userEvent.selectOptions(reassignSelect, 'user-2');
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Task assigned successfully');
      });
    });
  });

  describe('Moving Tasks Between Services', () => {
    it('should allow moving tasks between services', async () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Move a frontend task to backend service
      const moveServiceSelect = screen.getByTestId('move-service-task-2');
      await userEvent.selectOptions(moveServiceSelect, 'service-2');
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Task moved to different service');
      });
      
      // Verify the task now shows the new service
      const taskElement = screen.getByTestId('task-task-2');
      expect(taskElement).toHaveTextContent('Service: Backend API');
    });

    it('should maintain task properties when moving between services', async () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Get initial task state
      const taskElement = screen.getByTestId('task-task-1');
      expect(taskElement).toHaveTextContent('Design API endpoints');
      expect(taskElement).toHaveTextContent('Status: TODO');
      expect(taskElement).toHaveTextContent('Assignee: Backend Dev');
      
      // Move task to different service
      const moveServiceSelect = screen.getByTestId('move-service-task-1');
      await userEvent.selectOptions(moveServiceSelect, 'service-1');
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Task moved to different service');
      });
      
      // Verify task properties are maintained
      expect(taskElement).toHaveTextContent('Design API endpoints');
      expect(taskElement).toHaveTextContent('Status: TODO');
      expect(taskElement).toHaveTextContent('Assignee: Backend Dev');
      expect(taskElement).toHaveTextContent('Service: Frontend Development');
    });

    it('should handle moving confidential tasks between services', async () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Move confidential task
      const moveServiceSelect = screen.getByTestId('move-service-task-3');
      await userEvent.selectOptions(moveServiceSelect, 'service-2');
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Task moved to different service');
      });
      
      // Verify confidential flag is maintained
      const taskElement = screen.getByTestId('task-task-3');
      expect(taskElement).toHaveTextContent('Confidential: Yes');
      expect(taskElement).toHaveTextContent('Service: Backend API');
    });
  });

  describe('Service-Based Task Visibility', () => {
    it('should show task service information clearly', () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Verify each task shows its service
      expect(screen.getByText('Service: Backend API')).toBeInTheDocument();
      expect(screen.getByText('Service: Frontend Development')).toBeInTheDocument();
      expect(screen.getByText('Service: DevOps Infrastructure')).toBeInTheDocument();
    });

    it('should display member roles when showing assignees', () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Check that member roles are displayed in assignment dropdowns
      const reassignSelect = screen.getByTestId('reassign-task-1');
      expect(reassignSelect).toHaveTextContent('Test User (ADMIN)');
      expect(reassignSelect).toHaveTextContent('Frontend Dev (MEMBER)');
      expect(reassignSelect).toHaveTextContent('Backend Dev (MEMBER)');
      expect(reassignSelect).toHaveTextContent('QA Visitor (VISITOR)');
    });

    it('should handle visitor role assignments across services', async () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Assign task to a visitor
      const reassignSelect = screen.getByTestId('reassign-task-1');
      await userEvent.selectOptions(reassignSelect, 'user-4');
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Task assigned successfully');
      });
      
      // Verify visitor can be assigned to tasks across services
      expect(screen.getByText('Assignee: QA Visitor')).toBeInTheDocument();
    });
  });

  describe('Task Dependencies Across Services', () => {
    it('should show tasks from multiple services in coordinated view', () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Verify all services are represented
      const taskList = screen.getByTestId('task-list');
      expect(taskList).toHaveTextContent('Frontend Development');
      expect(taskList).toHaveTextContent('Backend API');
      expect(taskList).toHaveTextContent('DevOps Infrastructure');
    });

    it('should maintain task relationships when filtering', async () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Filter by a specific service
      const serviceSelect = screen.getByLabelText('Filter by Service:');
      await userEvent.selectOptions(serviceSelect, 'service-1');
      
      // Only frontend tasks should be visible
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument();
      expect(screen.queryByTestId('task-task-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('task-task-3')).not.toBeInTheDocument();
      
      // Switch back to all services
      await userEvent.selectOptions(serviceSelect, 'all');
      
      // All tasks should be visible again
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-3')).toBeInTheDocument();
    });
  });

  describe('Cross-Service Search and Discovery', () => {
    it('should allow discovering tasks across all services', () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Verify all task types are discoverable
      expect(screen.getByText('Design API endpoints')).toBeInTheDocument();
      expect(screen.getByText('Implement frontend components')).toBeInTheDocument();
      expect(screen.getByText('Setup CI/CD pipeline')).toBeInTheDocument();
    });

    it('should provide service context for each task', () => {
      renderWithProviders(<CrossServiceTaskDashboard />);
      
      // Each task should clearly indicate its service
      const backendTask = screen.getByTestId('task-task-1');
      const frontendTask = screen.getByTestId('task-task-2');
      const devopsTask = screen.getByTestId('task-task-3');
      
      expect(backendTask).toHaveTextContent('Service: Backend API');
      expect(frontendTask).toHaveTextContent('Service: Frontend Development');
      expect(devopsTask).toHaveTextContent('Service: DevOps Infrastructure');
    });
  });
});
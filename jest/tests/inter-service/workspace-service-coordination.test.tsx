import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock external dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}));

jest.mock('@/lib/appwrite', () => ({
  createSessionClient: jest.fn(() => ({
    account: {
      get: jest.fn(() => Promise.resolve({
        $id: 'current-user',
        name: 'Current User',
        email: 'current@example.com',
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

// Mock data
const mockWorkspace = {
  $id: 'workspace-1',
  name: 'Product Development Workspace',
  imageUrl: '',
  inviteCode: 'PROD123',
  userId: 'workspace-owner',
};

const mockServices = [
  {
    $id: 'service-1',
    name: 'Frontend Team',
    imageUrl: '',
    workspaceId: 'workspace-1',
    userId: 'frontend-lead',
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    $id: 'service-2',
    name: 'Backend Team',
    imageUrl: '',
    workspaceId: 'workspace-1',
    userId: 'backend-lead',
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    $id: 'service-3',
    name: 'QA Team',
    imageUrl: '',
    workspaceId: 'workspace-1',
    userId: 'qa-lead',
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    $id: 'service-4',
    name: 'DevOps Team',
    imageUrl: '',
    workspaceId: 'workspace-1',
    userId: 'devops-lead',
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const mockTasks = [
  {
    $id: 'task-1',
    name: 'User Authentication UI',
    description: 'Design and implement login/signup forms',
    status: 'IN_PROGRESS',
    workspaceId: 'workspace-1',
    serviceId: 'service-1',
    assigneeId: 'frontend-dev-1',
    creatorId: 'frontend-lead',
    dueDate: '2024-12-31',
    attachmentId: '',
    followedIds: JSON.stringify(['frontend-lead', 'frontend-dev-1', 'backend-dev-1']),
    isConfidential: false,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    $id: 'task-2',
    name: 'Authentication API Endpoints',
    description: 'Implement JWT-based authentication system',
    status: 'TODO',
    workspaceId: 'workspace-1',
    serviceId: 'service-2',
    assigneeId: 'backend-dev-1',
    creatorId: 'backend-lead',
    dueDate: '2024-12-25',
    attachmentId: '',
    followedIds: JSON.stringify(['backend-lead', 'backend-dev-1', 'frontend-dev-1']),
    isConfidential: false,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    $id: 'task-3',
    name: 'Authentication Testing',
    description: 'Create test cases for auth flow',
    status: 'TODO',
    workspaceId: 'workspace-1',
    serviceId: 'service-3',
    assigneeId: 'qa-tester-1',
    creatorId: 'qa-lead',
    dueDate: '2025-01-05',
    attachmentId: '',
    followedIds: JSON.stringify(['qa-lead', 'qa-tester-1', 'frontend-dev-1', 'backend-dev-1']),
    isConfidential: false,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    $id: 'task-4',
    name: 'Production Deployment Pipeline',
    description: 'Setup CI/CD for authentication features',
    status: 'TODO',
    workspaceId: 'workspace-1',
    serviceId: 'service-4',
    assigneeId: 'devops-engineer-1',
    creatorId: 'devops-lead',
    dueDate: '2025-01-10',
    attachmentId: '',
    followedIds: JSON.stringify(['devops-lead', 'devops-engineer-1']),
    isConfidential: false,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    $id: 'task-5',
    name: 'Database Migration Scripts',
    description: 'Create user table and auth schema',
    status: 'DONE',
    workspaceId: 'workspace-1',
    serviceId: 'service-2',
    assigneeId: 'backend-dev-2',
    creatorId: 'backend-lead',
    dueDate: '2024-12-15',
    attachmentId: '',
    followedIds: JSON.stringify(['backend-lead', 'backend-dev-2']),
    isConfidential: false,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const mockMembers = [
  { userId: 'workspace-owner', name: 'Workspace Owner', role: 'ADMIN' },
  { userId: 'frontend-lead', name: 'Frontend Lead', role: 'MEMBER' },
  { userId: 'backend-lead', name: 'Backend Lead', role: 'MEMBER' },
  { userId: 'qa-lead', name: 'QA Lead', role: 'MEMBER' },
  { userId: 'devops-lead', name: 'DevOps Lead', role: 'MEMBER' },
  { userId: 'frontend-dev-1', name: 'Frontend Dev 1', role: 'MEMBER' },
  { userId: 'backend-dev-1', name: 'Backend Dev 1', role: 'MEMBER' },
  { userId: 'backend-dev-2', name: 'Backend Dev 2', role: 'MEMBER' },
  { userId: 'qa-tester-1', name: 'QA Tester 1', role: 'VISITOR' },
  { userId: 'devops-engineer-1', name: 'DevOps Engineer 1', role: 'MEMBER' },
];

// Service coordination component
const WorkspaceServiceCoordination = () => {
  const [selectedService, setSelectedService] = React.useState<string>('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentView, setCurrentView] = React.useState<'dashboard' | 'kanban' | 'timeline'>('dashboard');
  const [serviceStats, setServiceStats] = React.useState<Record<string, any>>({});

  React.useEffect(() => {
    // Calculate service statistics
    const stats = mockServices.reduce((acc, service) => {
      const serviceTasks = mockTasks.filter(task => task.serviceId === service.$id);
      acc[service.$id] = {
        totalTasks: serviceTasks.length,
        completedTasks: serviceTasks.filter(task => task.status === 'DONE').length,
        inProgressTasks: serviceTasks.filter(task => task.status === 'IN_PROGRESS').length,
        todoTasks: serviceTasks.filter(task => task.status === 'TODO').length,
        overdueCount: serviceTasks.filter(task => 
          new Date(task.dueDate) < new Date() && task.status !== 'DONE'
        ).length,
      };
      return acc;
    }, {} as Record<string, any>);
    setServiceStats(stats);
  }, []);

  const filteredTasks = mockTasks.filter(task => {
    const serviceMatch = selectedService === 'all' || task.serviceId === selectedService;
    const searchMatch = searchTerm === '' || 
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    return serviceMatch && searchMatch;
  });

  const getServiceName = (serviceId: string) => {
    return mockServices.find(s => s.$id === serviceId)?.name || 'Unknown Service';
  };

  const getAssigneeName = (assigneeId: string) => {
    return mockMembers.find(m => m.userId === assigneeId)?.name || 'Unassigned';
  };

  const handleServiceSwitch = (serviceId: string) => {
    setSelectedService(serviceId);
    // Simulate maintaining context during service switch
    console.log(`Switching to service: ${serviceId}, maintaining search: ${searchTerm}`);
  };

  const crossServiceSearch = (term: string) => {
    setSearchTerm(term);
    // Don't automatically expand to all services for search
    // Keep current service selection if one is active
  };

  return (
    <div data-testid="workspace-service-coordination">
      {/* Workspace Overview */}
      <div data-testid="workspace-overview">
        <h1>{mockWorkspace.name}</h1>
        <div data-testid="workspace-stats">
          <div>Total Services: {mockServices.length}</div>
          <div>Total Tasks: {mockTasks.length}</div>
          <div>Active Members: {mockMembers.length}</div>
        </div>
      </div>

      {/* Service Statistics Dashboard */}
      <div data-testid="service-statistics">
        <h2>Service Statistics</h2>
        {mockServices.map(service => {
          const stats = serviceStats[service.$id] || {};
          return (
            <div key={service.$id} data-testid={`service-stats-${service.$id}`} className="service-stat-card">
              <h3>{service.name}</h3>
              <div>Total Tasks: {stats.totalTasks || 0}</div>
              <div>Completed: {stats.completedTasks || 0}</div>
              <div>In Progress: {stats.inProgressTasks || 0}</div>
              <div>To Do: {stats.todoTasks || 0}</div>
              <div>Overdue: {stats.overdueCount || 0}</div>
              <div>Completion Rate: {
                stats.totalTasks > 0 
                  ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
                  : 0
              }%</div>
            </div>
          );
        })}
      </div>

      {/* View Switcher */}
      <div data-testid="view-switcher">
        <button 
          onClick={() => setCurrentView('dashboard')}
          data-testid="view-dashboard"
          className={currentView === 'dashboard' ? 'active' : ''}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setCurrentView('kanban')}
          data-testid="view-kanban"
          className={currentView === 'kanban' ? 'active' : ''}
        >
          Kanban Board
        </button>
        <button 
          onClick={() => setCurrentView('timeline')}
          data-testid="view-timeline"
          className={currentView === 'timeline' ? 'active' : ''}
        >
          Timeline
        </button>
      </div>

      {/* Service Filter and Search */}
      <div data-testid="service-controls">
        <div data-testid="service-switcher">
          <label htmlFor="service-select">Current Service View:</label>
          <select 
            id="service-select"
            value={selectedService} 
            onChange={(e) => handleServiceSwitch(e.target.value)}
          >
            <option value="all">All Services</option>
            {mockServices.map(service => (
              <option key={service.$id} value={service.$id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        <div data-testid="cross-service-search">
          <label htmlFor="search-input">Search Across Services:</label>
          <input
            id="search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => crossServiceSearch(e.target.value)}
            placeholder="Search tasks, descriptions..."
          />
        </div>
      </div>

      {/* Task List with Service Context */}
      <div data-testid="coordinated-task-list">
        <h3>Tasks ({filteredTasks.length} found)</h3>
        {filteredTasks.length === 0 ? (
          <p data-testid="no-tasks-message">No tasks found matching criteria</p>
        ) : (
          filteredTasks.map(task => (
            <div key={task.$id} data-testid={`task-${task.$id}`} className="task-item">
              <h4>{task.name}</h4>
              <p>Service: {getServiceName(task.serviceId)}</p>
              <p>Assignee: {getAssigneeName(task.assigneeId)}</p>
              <p>Status: {task.status}</p>
              <p>Due: {task.dueDate}</p>
              <div data-testid={`task-actions-${task.$id}`}>
                <button onClick={() => console.log(`Viewing task ${task.$id}`)}>
                  View Details
                </button>
                <button onClick={() => console.log(`Editing task ${task.$id}`)}>
                  Edit Task
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Service Dependencies Visualization */}
      <div data-testid="service-dependencies">
        <h3>Service Dependencies</h3>
        <div data-testid="dependency-map">
          <div data-testid="dependency-frontend-backend">
            Frontend Team → Backend Team (Auth API dependency)
          </div>
          <div data-testid="dependency-backend-qa">
            Backend Team → QA Team (Testing dependency)
          </div>
          <div data-testid="dependency-qa-devops">
            QA Team → DevOps Team (Deployment dependency)
          </div>
        </div>
      </div>

      {/* Cross-Service Collaboration */}
      <div data-testid="cross-service-collaboration">
        <h3>Cross-Service Task Relationships</h3>
        {mockTasks
          .filter(task => {
            const followers = JSON.parse(task.followedIds || '[]');
            return followers.some((followerId: string) => {
              const followerService = mockTasks.find(t => t.assigneeId === followerId || t.creatorId === followerId);
              return followerService && followerService.serviceId !== task.serviceId;
            });
          })
          .map(task => (
            <div key={task.$id} data-testid={`cross-service-task-${task.$id}`}>
              <strong>{task.name}</strong> - {getServiceName(task.serviceId)}
              <div>Cross-service followers: 
                {JSON.parse(task.followedIds || '[]').map((followerId: string) => {
                  const follower = mockMembers.find(m => m.userId === followerId);
                  return follower ? follower.name : 'Unknown';
                }).join(', ')}
              </div>
            </div>
          ))
        }
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

describe('Workspace Service Coordination', () => {
  describe('Workspace Overview and Statistics', () => {
    it('should display workspace overview with service and task counts', () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      expect(screen.getByText('Product Development Workspace')).toBeInTheDocument();
      expect(screen.getByText('Total Services: 4')).toBeInTheDocument();
      expect(screen.getByText('Total Tasks: 5')).toBeInTheDocument();
      expect(screen.getByText('Active Members: 10')).toBeInTheDocument();
    });

    it('should display statistics for each service', () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      // Check frontend team stats
      const frontendStats = screen.getByTestId('service-stats-service-1');
      expect(frontendStats).toHaveTextContent('Frontend Team');
      expect(frontendStats).toHaveTextContent('Total Tasks: 1');
      expect(frontendStats).toHaveTextContent('In Progress: 1');

      // Check backend team stats  
      const backendStats = screen.getByTestId('service-stats-service-2');
      expect(backendStats).toHaveTextContent('Backend Team');
      expect(backendStats).toHaveTextContent('Total Tasks: 2');
      expect(backendStats).toHaveTextContent('Completed: 1');
      expect(backendStats).toHaveTextContent('To Do: 1');

      // Check QA team stats
      const qaStats = screen.getByTestId('service-stats-service-3');
      expect(qaStats).toHaveTextContent('QA Team');
      expect(qaStats).toHaveTextContent('Total Tasks: 1');
      expect(qaStats).toHaveTextContent('To Do: 1');
    });

    it('should calculate completion rates correctly', () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      // Backend team should show 50% completion (1 done out of 2 total)
      const backendStats = screen.getByTestId('service-stats-service-2');
      expect(backendStats).toHaveTextContent('Completion Rate: 50%');

      // Frontend team should show 0% completion (0 done out of 1 total)
      const frontendStats = screen.getByTestId('service-stats-service-1');
      expect(frontendStats).toHaveTextContent('Completion Rate: 0%');
    });
  });

  describe('Service Switching with Context Preservation', () => {
    it('should maintain search context when switching services', async () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      // Enter search term
      const searchInput = screen.getByLabelText('Search Across Services:');
      await userEvent.type(searchInput, 'authentication');

      // Should find auth-related tasks
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-3')).toBeInTheDocument();

      // Switch to specific service
      const serviceSelect = screen.getByLabelText('Current Service View:');
      await userEvent.selectOptions(serviceSelect, 'service-1');

      // Should maintain search term but filter by service
      expect(searchInput).toHaveValue('authentication');
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument();
      expect(screen.queryByTestId('task-task-2')).not.toBeInTheDocument();
    });

    it('should handle view switching while maintaining service context', async () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      // Select a specific service
      const serviceSelect = screen.getByLabelText('Current Service View:');
      await userEvent.selectOptions(serviceSelect, 'service-2');

      // Switch views
      const kanbanView = screen.getByTestId('view-kanban');
      await userEvent.click(kanbanView);

      expect(kanbanView).toHaveClass('active');
      // Service selection should be maintained
      expect(serviceSelect).toHaveValue('service-2');
    });

    it('should preserve state when navigating between services', async () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      // Set initial state
      const searchInput = screen.getByLabelText('Search Across Services:');
      await userEvent.type(searchInput, 'deployment');

      // Switch to DevOps service
      const serviceSelect = screen.getByLabelText('Current Service View:');
      await userEvent.selectOptions(serviceSelect, 'service-4');

      // Verify state is preserved
      expect(searchInput).toHaveValue('deployment');
      expect(serviceSelect).toHaveValue('service-4');
      expect(screen.getByTestId('task-task-4')).toBeInTheDocument();
    });
  });

  describe('Cross-Service Search and Filtering', () => {
    it('should search across all services when term is entered', async () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      const searchInput = screen.getByLabelText('Search Across Services:');
      await userEvent.type(searchInput, 'API');

      // Search should work within current service context
      const serviceSelect = screen.getByLabelText('Current Service View:');
      // Service selection should remain as is (not automatically changed)
      
      // Should find tasks containing "API"
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument(); // "Authentication API Endpoints"
    });

    it('should provide no results message when search finds nothing', async () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      const searchInput = screen.getByLabelText('Search Across Services:');
      await userEvent.type(searchInput, 'nonexistent-term');

      expect(screen.getByTestId('no-tasks-message')).toBeInTheDocument();
      expect(screen.getByText('Tasks (0 found)')).toBeInTheDocument();
    });

    it('should search in both task names and descriptions', async () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      const searchInput = screen.getByLabelText('Search Across Services:');
      
      // Search for term in description
      await userEvent.clear(searchInput);
      await userEvent.type(searchInput, 'JWT-based');

      expect(screen.getByTestId('task-task-2')).toBeInTheDocument();
      
      // Search for term in title
      await userEvent.clear(searchInput);
      await userEvent.type(searchInput, 'Pipeline');

      expect(screen.getByTestId('task-task-4')).toBeInTheDocument();
    });

    it('should combine service filtering with search', async () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      // First set service filter
      const serviceSelect = screen.getByLabelText('Current Service View:');
      await userEvent.selectOptions(serviceSelect, 'service-2');

      // Then search within that service
      const searchInput = screen.getByLabelText('Search Across Services:');
      await userEvent.type(searchInput, 'auth', { delay: 50 });

      // Should only show backend tasks matching search
      await waitFor(() => {
        expect(screen.getByTestId('task-task-2')).toBeInTheDocument();
      });
      
      // Task from different service should not be visible
      expect(screen.queryByTestId('task-task-1')).not.toBeInTheDocument();
    });
  });

  describe('Service Dependencies and Relationships', () => {
    it('should display service dependency mapping', () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      expect(screen.getByTestId('dependency-frontend-backend')).toHaveTextContent(
        'Frontend Team → Backend Team (Auth API dependency)'
      );
      expect(screen.getByTestId('dependency-backend-qa')).toHaveTextContent(
        'Backend Team → QA Team (Testing dependency)'
      );
      expect(screen.getByTestId('dependency-qa-devops')).toHaveTextContent(
        'QA Team → DevOps Team (Deployment dependency)'
      );
    });

    it('should identify cross-service task relationships', () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      // Should show tasks that have followers from other services
      expect(screen.getByTestId('cross-service-task-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('cross-service-task-task-2')).toBeInTheDocument();
      expect(screen.getByTestId('cross-service-task-task-3')).toBeInTheDocument();

      // Verify follower information is displayed
      const crossServiceTask = screen.getByTestId('cross-service-task-task-1');
      expect(crossServiceTask).toHaveTextContent('Frontend Lead, Frontend Dev 1, Backend Dev 1');
    });

    it('should show service context for each task', () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      const frontendTask = screen.getByTestId('task-task-1');
      expect(frontendTask).toHaveTextContent('Service: Frontend Team');

      const backendTask = screen.getByTestId('task-task-2');
      expect(backendTask).toHaveTextContent('Service: Backend Team');

      const qaTask = screen.getByTestId('task-task-3');
      expect(qaTask).toHaveTextContent('Service: QA Team');
    });
  });

  describe('Workspace-Wide Aggregation', () => {
    it('should aggregate data across all services for dashboard view', () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      // Verify aggregated statistics
      expect(screen.getByText('Total Services: 4')).toBeInTheDocument();
      expect(screen.getByText('Total Tasks: 5')).toBeInTheDocument();

      // All service statistics should be visible
      expect(screen.getByTestId('service-stats-service-1')).toBeInTheDocument();
      expect(screen.getByTestId('service-stats-service-2')).toBeInTheDocument();
      expect(screen.getByTestId('service-stats-service-3')).toBeInTheDocument();
      expect(screen.getByTestId('service-stats-service-4')).toBeInTheDocument();
    });

    it('should show completion status across all services', () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      // Should show tasks in different states from different services
      expect(screen.getByTestId('task-task-1')).toHaveTextContent('Status: IN_PROGRESS');
      expect(screen.getByTestId('task-task-2')).toHaveTextContent('Status: TODO');
      expect(screen.getByTestId('task-task-5')).toHaveTextContent('Status: DONE');
    });

    it('should provide comprehensive task listing with service attribution', () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      // All tasks should be visible with their service context
      expect(screen.getByText('Tasks (5 found)')).toBeInTheDocument();
      
      // Each task should show service information
      mockTasks.forEach(task => {
        const taskElement = screen.getByTestId(`task-${task.$id}`);
        const service = mockServices.find(s => s.$id === task.serviceId);
        expect(taskElement).toHaveTextContent(`Service: ${service?.name}`);
      });
    });
  });

  describe('Multi-Service Project Coordination', () => {
    it('should show related tasks across multiple services', () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      // Authentication-related tasks span multiple services
      const authTasks = [
        screen.getByTestId('task-task-1'), // Frontend auth UI
        screen.getByTestId('task-task-2'), // Backend auth API
        screen.getByTestId('task-task-3'), // QA auth testing
      ];

      authTasks.forEach(taskElement => {
        expect(taskElement).toHaveTextContent(/authentication|auth/i);
      });
    });

    it('should handle task actions across different services', () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      // All tasks should have action buttons regardless of service
      mockTasks.forEach(task => {
        const actionsElement = screen.getByTestId(`task-actions-${task.$id}`);
        expect(actionsElement).toHaveTextContent('View Details');
        expect(actionsElement).toHaveTextContent('Edit Task');
      });
    });

    it('should maintain task relationships when viewing across services', () => {
      renderWithProviders(<WorkspaceServiceCoordination />);

      // Tasks should maintain their due date relationships for coordination
      expect(screen.getByTestId('task-task-2')).toHaveTextContent('Due: 2024-12-25');
      expect(screen.getByTestId('task-task-1')).toHaveTextContent('Due: 2024-12-31');
      expect(screen.getByTestId('task-task-3')).toHaveTextContent('Due: 2025-01-05');
      
      // Dependencies should be clear (backend before frontend before QA)
    });
  });
});
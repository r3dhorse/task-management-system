import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock external dependencies
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
  name: 'Development Workspace',
  imageUrl: '',
  inviteCode: 'DEV123',
  userId: 'admin-user',
};

const mockServices = [
  {
    $id: 'service-1',
    name: 'Web Frontend',
    imageUrl: '',
    workspaceId: 'workspace-1',
    userId: 'admin-user',
  },
  {
    $id: 'service-2',
    name: 'API Backend',
    imageUrl: '',
    workspaceId: 'workspace-1',
    userId: 'admin-user',
  },
  {
    $id: 'service-3',
    name: 'Mobile App',
    imageUrl: '',
    workspaceId: 'workspace-1',
    userId: 'service-admin',
  },
];

const mockMembers = [
  {
    $id: 'member-1',
    userId: 'admin-user',
    workspaceId: 'workspace-1',
    name: 'Workspace Admin',
    email: 'admin@example.com',
    role: 'ADMIN',
  },
  {
    $id: 'member-2',
    userId: 'service-admin',
    workspaceId: 'workspace-1',
    name: 'Service Admin',
    email: 'service.admin@example.com',
    role: 'MEMBER',
  },
  {
    $id: 'member-3',
    userId: 'developer-1',
    workspaceId: 'workspace-1',
    name: 'Frontend Developer',
    email: 'frontend@example.com',
    role: 'MEMBER',
  },
  {
    $id: 'member-4',
    userId: 'developer-2',
    workspaceId: 'workspace-1',
    name: 'Backend Developer',
    email: 'backend@example.com',
    role: 'MEMBER',
  },
  {
    $id: 'member-5',
    userId: 'qa-tester',
    workspaceId: 'workspace-1',
    name: 'QA Tester',
    email: 'qa@example.com',
    role: 'VISITOR',
  },
  {
    $id: 'member-6',
    userId: 'external-consultant',
    workspaceId: 'workspace-1',
    name: 'External Consultant',
    email: 'consultant@example.com',
    role: 'VISITOR',
  },
];

const mockTasks = [
  {
    $id: 'task-1',
    name: 'Public Frontend Task',
    description: 'Implement user interface components',
    status: 'TODO',
    workspaceId: 'workspace-1',
    serviceId: 'service-1',
    assigneeId: 'developer-1',
    creatorId: 'admin-user',
    dueDate: '2024-12-31',
    attachmentId: '',
    followedIds: JSON.stringify(['admin-user', 'developer-1', 'qa-tester']),
    isConfidential: false,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    $id: 'task-2',
    name: 'Confidential API Development',
    description: 'Implement secure authentication endpoints',
    status: 'IN_PROGRESS',
    workspaceId: 'workspace-1',
    serviceId: 'service-2',
    assigneeId: 'developer-2',
    creatorId: 'admin-user',
    dueDate: '2025-01-15',
    attachmentId: '',
    followedIds: JSON.stringify(['admin-user', 'developer-2']),
    isConfidential: true,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    $id: 'task-3',
    name: 'Mobile App Feature',
    description: 'Add new user registration flow',
    status: 'TODO',
    workspaceId: 'workspace-1',
    serviceId: 'service-3',
    assigneeId: 'service-admin',
    creatorId: 'service-admin',
    dueDate: '2025-01-20',
    attachmentId: '',
    followedIds: JSON.stringify(['service-admin', 'external-consultant']),
    isConfidential: false,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    $id: 'task-4',
    name: 'Cross-Service Integration',
    description: 'Connect frontend and backend services',
    status: 'TODO',
    workspaceId: 'workspace-1',
    serviceId: 'service-1',
    assigneeId: 'developer-1',
    creatorId: 'admin-user',
    dueDate: '2025-02-01',
    attachmentId: '',
    followedIds: JSON.stringify(['admin-user', 'developer-1', 'developer-2']),
    isConfidential: true,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

// Permission checking utilities
const canViewTask = (task: any, currentUserId: string, currentUserRole: string) => {
  if (currentUserRole === 'ADMIN') return true;
  if (currentUserRole === 'VISITOR') {
    // Visitors can only see tasks they follow
    const followedIds = JSON.parse(task.followedIds || '[]');
    return followedIds.includes(currentUserId);
  }
  if (!task.isConfidential) return true;
  if (task.assigneeId === currentUserId) return true;
  if (task.creatorId === currentUserId) return true;
  
  const followedIds = JSON.parse(task.followedIds || '[]');
  return followedIds.includes(currentUserId);
};

const canEditTask = (task: any, currentUserId: string, currentUserRole: string) => {
  if (currentUserRole === 'ADMIN') return true;
  if (task.assigneeId === currentUserId) return true;
  if (task.creatorId === currentUserId) return true;
  return false;
};

const canManageService = (service: any, currentUserId: string, currentUserRole: string) => {
  if (currentUserRole === 'ADMIN') return true;
  if (service.userId === currentUserId) return true;
  return false;
};

// Test component for permission testing
const ServicePermissionDashboard = ({ currentUserId, currentUserRole }: { currentUserId: string, currentUserRole: string }) => {
  const [selectedService, setSelectedService] = React.useState<string>('all');
  const [showConfidentialTasks, setShowConfidentialTasks] = React.useState(false);

  const visibleTasks = mockTasks.filter(task => {
    const serviceMatch = selectedService === 'all' || task.serviceId === selectedService;
    const permissionMatch = canViewTask(task, currentUserId, currentUserRole);
    
    return serviceMatch && permissionMatch;
  });

  const editableTasks = visibleTasks.filter(task => canEditTask(task, currentUserId, currentUserRole));
  const manageableServices = mockServices.filter(service => canManageService(service, currentUserId, currentUserRole));

  return (
    <div data-testid="service-permission-dashboard">
      <div data-testid="user-info">
        <p>Current User: {mockMembers.find(m => m.userId === currentUserId)?.name}</p>
        <p>Role: {currentUserRole}</p>
      </div>

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

      <div data-testid="confidential-toggle">
        <label>
          <input
            type="checkbox"
            checked={showConfidentialTasks}
            onChange={(e) => setShowConfidentialTasks(e.target.checked)}
          />
          Show Confidential Tasks (if permitted)
        </label>
      </div>

      <div data-testid="manageable-services">
        <h3>Services You Can Manage:</h3>
        {manageableServices.length === 0 ? (
          <p>No services available for management</p>
        ) : (
          manageableServices.map(service => (
            <div key={service.$id} data-testid={`manageable-service-${service.$id}`}>
              {service.name}
            </div>
          ))
        )}
      </div>

      <div data-testid="visible-tasks">
        <h3>Visible Tasks ({visibleTasks.length}):</h3>
        {visibleTasks.map(task => {
          const service = mockServices.find(s => s.$id === task.serviceId);
          const assignee = mockMembers.find(m => m.userId === task.assigneeId);
          const canEdit = canEditTask(task, currentUserId, currentUserRole);
          
          return (
            <div key={task.$id} data-testid={`task-${task.$id}`} className="task-item">
              <h4>{task.name}</h4>
              <p>Service: {service?.name}</p>
              <p>Assignee: {assignee?.name}</p>
              <p>Status: {task.status}</p>
              <p>Confidential: {task.isConfidential ? 'Yes' : 'No'}</p>
              <p>Can Edit: {canEdit ? 'Yes' : 'No'}</p>
              
              {canEdit && (
                <button data-testid={`edit-task-${task.$id}`}>
                  Edit Task
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div data-testid="editable-tasks">
        <h3>Tasks You Can Edit ({editableTasks.length}):</h3>
        {editableTasks.map(task => (
          <div key={task.$id} data-testid={`editable-task-${task.$id}`}>
            {task.name}
          </div>
        ))}
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

describe('Service Member Permissions', () => {
  describe('Workspace Admin Permissions', () => {
    it('should allow workspace admin to view all tasks across all services', () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="admin-user" currentUserRole="ADMIN" />
      );

      // Admin should see all tasks
      expect(screen.getByText('Visible Tasks (4):')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-3')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-4')).toBeInTheDocument();
    });

    it('should allow workspace admin to edit all tasks', () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="admin-user" currentUserRole="ADMIN" />
      );

      // Admin should be able to edit all tasks
      expect(screen.getByText('Tasks You Can Edit (4):')).toBeInTheDocument();
      expect(screen.getByTestId('edit-task-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('edit-task-task-2')).toBeInTheDocument();
      expect(screen.getByTestId('edit-task-task-3')).toBeInTheDocument();
      expect(screen.getByTestId('edit-task-task-4')).toBeInTheDocument();
    });

    it('should allow workspace admin to manage all services', () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="admin-user" currentUserRole="ADMIN" />
      );

      // Admin should be able to manage all services
      expect(screen.getByTestId('manageable-service-service-1')).toBeInTheDocument();
      expect(screen.getByTestId('manageable-service-service-2')).toBeInTheDocument();
      expect(screen.getByTestId('manageable-service-service-3')).toBeInTheDocument();
    });

    it('should allow workspace admin to view confidential tasks across services', async () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="admin-user" currentUserRole="ADMIN" />
      );

      // Enable confidential task viewing
      const confidentialToggle = screen.getByLabelText('Show Confidential Tasks (if permitted)');
      await userEvent.click(confidentialToggle);

      // Admin should see all tasks including confidential ones
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument();
      expect(screen.getByTestId('task-task-4')).toBeInTheDocument();
      
      // Verify confidential tasks are marked
      const confidentialTask2 = screen.getByTestId('task-task-2');
      const confidentialTask4 = screen.getByTestId('task-task-4');
      expect(confidentialTask2).toHaveTextContent('Confidential: Yes');
      expect(confidentialTask4).toHaveTextContent('Confidential: Yes');
    });
  });

  describe('Service Admin Permissions', () => {
    it('should allow service admin to manage only their service', () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="service-admin" currentUserRole="MEMBER" />
      );

      // Service admin should only manage their own service
      expect(screen.getByTestId('manageable-service-service-3')).toBeInTheDocument();
      expect(screen.queryByTestId('manageable-service-service-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('manageable-service-service-2')).not.toBeInTheDocument();
    });

    it('should allow service admin to edit their own tasks and assigned tasks', () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="service-admin" currentUserRole="MEMBER" />
      );

      // Service admin should edit their own created/assigned tasks
      expect(screen.getByTestId('editable-task-task-3')).toBeInTheDocument();
      expect(screen.queryByTestId('editable-task-task-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('editable-task-task-2')).not.toBeInTheDocument();
    });

    it('should restrict service admin from viewing confidential tasks in other services', async () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="service-admin" currentUserRole="MEMBER" />
      );

      // Enable confidential task viewing
      const confidentialToggle = screen.getByLabelText('Show Confidential Tasks (if permitted)');
      await userEvent.click(confidentialToggle);

      // Service admin should not see confidential tasks from other services
      expect(screen.queryByTestId('task-task-2')).not.toBeInTheDocument(); // Confidential backend task
      expect(screen.queryByTestId('task-task-4')).not.toBeInTheDocument(); // Confidential frontend task
      expect(screen.getByTestId('task-task-3')).toBeInTheDocument(); // Their own task
    });
  });

  describe('Member Permissions Across Services', () => {
    it('should allow frontend developer to view public tasks across services', () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="developer-1" currentUserRole="MEMBER" />
      );

      // Frontend developer should see public tasks and tasks they're assigned to
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument(); // Assigned to them
      expect(screen.getByTestId('task-task-3')).toBeInTheDocument(); // Public task
      expect(screen.queryByTestId('task-task-2')).not.toBeInTheDocument(); // Confidential, not assigned
    });

    it('should allow member to edit only their assigned tasks', () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="developer-1" currentUserRole="MEMBER" />
      );

      // Frontend developer should only edit their assigned tasks
      expect(screen.getByTestId('editable-task-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('editable-task-task-4')).toBeInTheDocument();
      expect(screen.queryByTestId('editable-task-task-3')).not.toBeInTheDocument();
    });

    it('should allow member to view confidential tasks they are assigned to or follow', async () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="developer-1" currentUserRole="MEMBER" />
      );

      // Enable confidential task viewing
      const confidentialToggle = screen.getByLabelText('Show Confidential Tasks (if permitted)');
      await userEvent.click(confidentialToggle);

      // Should see confidential task they're assigned to
      expect(screen.getByTestId('task-task-4')).toBeInTheDocument();
      // Should not see confidential task they're not involved with
      expect(screen.queryByTestId('task-task-2')).not.toBeInTheDocument();
    });

    it('should prevent member from managing any services', () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="developer-1" currentUserRole="MEMBER" />
      );

      // Regular member should not manage any services
      expect(screen.getByText('No services available for management')).toBeInTheDocument();
    });
  });

  describe('Visitor Permissions Across Services', () => {
    it('should limit visitor to only followed tasks across services', () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="qa-tester" currentUserRole="VISITOR" />
      );

      // Visitor should only see tasks they follow
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument(); // They follow this task
      expect(screen.queryByTestId('task-task-2')).not.toBeInTheDocument(); // Not following
      expect(screen.queryByTestId('task-task-3')).not.toBeInTheDocument(); // Not following
      expect(screen.queryByTestId('task-task-4')).not.toBeInTheDocument(); // Not following
    });

    it('should prevent visitor from editing any tasks', () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="qa-tester" currentUserRole="VISITOR" />
      );

      // Visitor should not be able to edit any tasks
      expect(screen.getByText('Tasks You Can Edit (0):')).toBeInTheDocument();
      expect(screen.queryByTestId('edit-task-task-1')).not.toBeInTheDocument();
    });

    it('should prevent visitor from managing any services', () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="qa-tester" currentUserRole="VISITOR" />
      );

      // Visitor should not manage any services
      expect(screen.getByText('No services available for management')).toBeInTheDocument();
    });

    it('should allow external consultant visitor to see followed tasks across services', () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="external-consultant" currentUserRole="VISITOR" />
      );

      // External consultant follows task-3
      expect(screen.getByTestId('task-task-3')).toBeInTheDocument();
      expect(screen.queryByTestId('task-task-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('task-task-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('task-task-4')).not.toBeInTheDocument();
    });
  });

  describe('Service-Specific Permission Filtering', () => {
    it('should maintain permission restrictions when filtering by service', async () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="developer-2" currentUserRole="MEMBER" />
      );

      // Filter by backend service
      const serviceSelect = screen.getByLabelText('Filter by Service:');
      await userEvent.selectOptions(serviceSelect, 'service-2');

      // Should only see backend tasks they have permission for
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument(); // Assigned to them
      expect(screen.queryByTestId('task-task-1')).not.toBeInTheDocument(); // Different service
      expect(screen.queryByTestId('task-task-3')).not.toBeInTheDocument(); // Different service
    });

    it('should handle permission changes when switching services', async () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="developer-1" currentUserRole="MEMBER" />
      );

      // Start with frontend service
      const serviceSelect = screen.getByLabelText('Filter by Service:');
      await userEvent.selectOptions(serviceSelect, 'service-1');

      // Should see frontend tasks
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument();
      expect(screen.queryByTestId('task-task-3')).not.toBeInTheDocument();

      // Switch to mobile service
      await userEvent.selectOptions(serviceSelect, 'service-3');

      // Should see mobile tasks (public ones they can view)
      expect(screen.getByTestId('task-task-3')).toBeInTheDocument();
      expect(screen.queryByTestId('task-task-1')).not.toBeInTheDocument();
    });
  });

  describe('Cross-Service Collaboration Permissions', () => {
    it('should show follower relationships across services', () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="developer-2" currentUserRole="MEMBER" />
      );

      // Developer-2 should see tasks they follow from other services
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument(); // Assigned to them
      expect(screen.getByTestId('task-task-4')).toBeInTheDocument(); // They follow this task
    });

    it('should handle multi-service task visibility for collaborators', () => {
      renderWithProviders(
        <ServicePermissionDashboard currentUserId="developer-1" currentUserRole="MEMBER" />
      );

      // Developer-1 should see their tasks across services
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument(); // Frontend, assigned
      expect(screen.getByTestId('task-task-4')).toBeInTheDocument(); // Frontend, assigned
      expect(screen.getByTestId('task-task-3')).toBeInTheDocument(); // Mobile, public
    });
  });
});
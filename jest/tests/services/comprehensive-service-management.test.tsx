import React from 'react'
import { render, screen, userEvent, waitFor } from '@/test-utils'

// Mock service types
interface MockService {
  id: string
  name: string
  workspaceId: string
  createdAt: string
  taskCount?: number
  memberCount?: number
}

interface MockUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'MEMBER' | 'VISITOR'
}

// Mock service list component
interface MockServiceListProps {
  services: MockService[];
  onCreateNew: () => void;
  onEdit: (service: MockService) => void;
  onDelete: (serviceId: string) => void;
  userRole: 'ADMIN' | 'MEMBER' | 'VISITOR';
  isLoading?: boolean;
}

const MockServiceList = ({ 
  services, 
  onCreateNew, 
  onEdit, 
  onDelete, 
  userRole,
  isLoading = false 
}: MockServiceListProps) => {
  const canManageServices = userRole === 'ADMIN'

  if (isLoading) {
    return <div data-testid="services-loading">Loading services...</div>
  }

  if (services.length === 0) {
    return (
      <div data-testid="no-services">
        <h2>No Services</h2>
        <p>This workspace doesn&apos;t have any services yet.</p>
        {canManageServices && (
          <button onClick={onCreateNew} data-testid="create-first-service">
            Create First Service
          </button>
        )}
      </div>
    )
  }

  return (
    <div data-testid="services-list">
      <div className="services-header">
        <h2>Services ({services.length})</h2>
        {canManageServices && (
          <button onClick={onCreateNew} data-testid="create-new-service">
            Create New Service
          </button>
        )}
      </div>
      
      <div className="services-grid">
        {services.map((service) => (
          <div key={service.id} data-testid={`service-${service.id}`} className="service-card">
            <div className="service-header">
              <h3>{service.name}</h3>
              <small>Created: {new Date(service.createdAt).toLocaleDateString()}</small>
            </div>
            
            <div className="service-stats">
              <div data-testid={`task-count-${service.id}`}>
                📋 {service.taskCount || 0} tasks
              </div>
              <div data-testid={`member-count-${service.id}`}>
                👥 {service.memberCount || 0} members
              </div>
            </div>
            
            <div className="service-actions">
              <button 
                onClick={() => window.location.href = `/services/${service.id}`}
                data-testid={`view-service-${service.id}`}
              >
                View Service
              </button>
              
              {canManageServices && (
                <>
                  <button 
                    onClick={() => onEdit(service)}
                    data-testid={`edit-service-${service.id}`}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => onDelete(service.id)}
                    data-testid={`delete-service-${service.id}`}
                    className="danger"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {!canManageServices && (
        <div data-testid="services-readonly">
          <p>Only workspace administrators can manage services.</p>
        </div>
      )}
    </div>
  )
}

// Mock service creation/edit form
interface MockServiceFormProps {
  service?: MockService | null;
  onSubmit: (data: { name: string }) => void;
  onCancel: () => void;
  isPending?: boolean;
  error?: string | null;
}

const MockServiceForm = ({ 
  service = null, 
  onSubmit, 
  onCancel, 
  isPending = false,
  error = null 
}: MockServiceFormProps) => {
  const [name, setName] = React.useState(service?.name || '')
  const [touched, setTouched] = React.useState(false)
  
  const isEdit = !!service
  const isValid = name.trim().length >= 2 && name.trim().length <= 50

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    
    if (!isValid) return
    
    onSubmit({
      name: name.trim()
    })
  }

  const getNameError = () => {
    if (!touched && name.length <= 50) return null
    if (!name.trim()) return 'Service name is required'
    if (name.trim().length < 2) return 'Service name must be at least 2 characters'
    if (name.length > 50) return 'Service name must be less than 50 characters'
    return null
  }

  const nameError = getNameError()

  return (
    <div data-testid="service-form-modal">
      <h2>{isEdit ? 'Edit Service' : 'Create New Service'}</h2>
      
      {error && (
        <div data-testid="form-error" role="alert" className="error">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="service-name">Service Name *</label>
          <input
            id="service-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g., Frontend Development, Marketing, Design"
            required
            disabled={isPending}
            className={nameError ? 'error' : ''}
          />
          <div className="field-info">
            <small>{name.length}/50 characters</small>
            {nameError && (
              <div data-testid="name-error" className="field-error">
                {nameError}
              </div>
            )}
          </div>
        </div>
        
        <div className="form-description">
          <p>Services help organize your workspace by grouping related tasks and team members. Examples:</p>
          <ul>
            <li>Frontend Development - UI/UX tasks</li>
            <li>Backend Development - API and database tasks</li>
            <li>Marketing - Campaigns and content tasks</li>
            <li>Design - Creative and branding tasks</li>
          </ul>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            onClick={onCancel}
            disabled={isPending}
            data-testid="cancel-service-form"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isPending || !isValid}
            data-testid="submit-service-form"
          >
            {isPending 
              ? (isEdit ? 'Updating...' : 'Creating...') 
              : (isEdit ? 'Update Service' : 'Create Service')
            }
          </button>
        </div>
      </form>
    </div>
  )
}

// Mock service detail view
interface MockServiceDetailProps {
  service: MockService;
  tasks: Array<{ id: string; name: string; status: string; assignee?: string }>;
  members: MockUser[];
  onUpdateService: () => void;
  onDeleteService: () => void;
  onCreateTask: () => void;
  userRole: 'ADMIN' | 'MEMBER' | 'VISITOR';
}

const MockServiceDetail = ({ 
  service, 
  tasks, 
  members, 
  onUpdateService, 
  onDeleteService, 
  onCreateTask, 
  userRole 
}: MockServiceDetailProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  
  const canManageService = userRole === 'ADMIN'
  const canCreateTasks = userRole === 'ADMIN' || userRole === 'MEMBER'

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status).length
  }

  return (
    <div data-testid="service-detail">
      <div className="service-header">
        <div>
          <h1>{service.name}</h1>
          <p>Created: {new Date(service.createdAt).toLocaleDateString()}</p>
        </div>
        
        {canManageService && (
          <div className="service-actions">
            <button 
              onClick={onUpdateService}
              data-testid="update-service-btn"
            >
              Edit Service
            </button>
            
            {!showDeleteConfirm ? (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                data-testid="delete-service-btn"
                className="danger"
              >
                Delete Service
              </button>
            ) : (
              <div data-testid="delete-confirmation">
                <p>Delete this service? This will also delete all associated tasks.</p>
                <button onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </button>
                <button 
                  onClick={onDeleteService}
                  data-testid="confirm-delete-service"
                  className="danger"
                >
                  Yes, Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="service-overview">
        <div className="stats-grid">
          <div data-testid="total-tasks" className="stat-card">
            <h3>Total Tasks</h3>
            <div className="stat-number">{tasks.length}</div>
          </div>
          
          <div data-testid="active-tasks" className="stat-card">
            <h3>Active Tasks</h3>
            <div className="stat-number">
              {getTasksByStatus('TODO') + getTasksByStatus('IN_PROGRESS')}
            </div>
          </div>
          
          <div data-testid="completed-tasks" className="stat-card">
            <h3>Completed</h3>
            <div className="stat-number">{getTasksByStatus('DONE')}</div>
          </div>
          
          <div data-testid="team-members" className="stat-card">
            <h3>Team Members</h3>
            <div className="stat-number">{members.length}</div>
          </div>
        </div>
      </div>
      
      <div className="service-content">
        <div className="tasks-section">
          <div className="section-header">
            <h2>Recent Tasks</h2>
            {canCreateTasks && (
              <button 
                onClick={onCreateTask}
                data-testid="create-task-btn"
              >
                Create Task
              </button>
            )}
          </div>
          
          {tasks.length === 0 ? (
            <div data-testid="no-tasks">
              <p>No tasks in this service yet.</p>
              {canCreateTasks && (
                <button onClick={onCreateTask}>Create First Task</button>
              )}
            </div>
          ) : (
            <div data-testid="tasks-list" className="tasks-list">
              {tasks.slice(0, 5).map(task => (
                <div key={task.id} data-testid={`task-${task.id}`} className="task-item">
                  <h4>{task.name}</h4>
                  <span className={`status-badge ${task.status.toLowerCase()}`}>
                    {task.status}
                  </span>
                  {task.assignee && <span>Assigned to: {task.assignee}</span>}
                </div>
              ))}
              {tasks.length > 5 && (
                <button data-testid="view-all-tasks">
                  View All {tasks.length} Tasks
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="members-section">
          <h2>Team Members ({members.length})</h2>
          
          <div data-testid="members-list" className="members-list">
            {members.map(member => (
              <div key={member.id} data-testid={`member-${member.id}`} className="member-item">
                <div>
                  <strong>{member.name}</strong>
                  <p>{member.email}</p>
                </div>
                <span className={`role-badge ${member.role.toLowerCase()}`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {!canManageService && (
        <div data-testid="service-readonly">
          <p>Only workspace administrators can modify this service.</p>
        </div>
      )}
    </div>
  )
}

// Mock service switcher
interface MockServiceSwitcherProps {
  services: MockService[];
  currentServiceId: string | null;
  onServiceChange: (serviceId: string) => void;
}

const MockServiceSwitcher = ({ 
  services, 
  currentServiceId, 
  onServiceChange 
}: MockServiceSwitcherProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  const currentService = services.find(s => s.id === currentServiceId)

  return (
    <div data-testid="service-switcher">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        data-testid="service-switcher-button"
        className="switcher-button"
      >
        {currentService ? currentService.name : 'Select Service'}
        <span className="chevron">{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && (
        <div data-testid="service-dropdown" className="dropdown">
          <div className="dropdown-header">
            <h3>Switch Service</h3>
          </div>
          
          <div className="service-options">
            {services.map(service => (
              <button
                key={service.id}
                onClick={() => {
                  onServiceChange(service.id)
                  setIsOpen(false)
                }}
                data-testid={`service-option-${service.id}`}
                className={`service-option ${service.id === currentServiceId ? 'active' : ''}`}
              >
                <div>
                  <strong>{service.name}</strong>
                  <small>{service.taskCount || 0} tasks</small>
                </div>
              </button>
            ))}
          </div>
          
          <div className="dropdown-footer">
            <button 
              onClick={() => setIsOpen(false)}
              data-testid="close-dropdown"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

describe('Comprehensive Service Management', () => {
  const mockServices: MockService[] = [
    {
      id: 'service-1',
      name: 'Frontend Development',
      workspaceId: 'ws-1',
      createdAt: '2024-01-01T00:00:00Z',
      taskCount: 15,
      memberCount: 4
    },
    {
      id: 'service-2',
      name: 'Backend Development',
      workspaceId: 'ws-1',
      createdAt: '2024-01-02T00:00:00Z',
      taskCount: 12,
      memberCount: 3
    },
    {
      id: 'service-3',
      name: 'Design',
      workspaceId: 'ws-1',
      createdAt: '2024-01-03T00:00:00Z',
      taskCount: 8,
      memberCount: 2
    }
  ]

  const mockTasks = [
    { id: 'task-1', name: 'Implement auth', status: 'IN_PROGRESS', assignee: 'John Doe' },
    { id: 'task-2', name: 'Create dashboard', status: 'TODO', assignee: 'Jane Smith' },
    { id: 'task-3', name: 'Fix bug #123', status: 'DONE', assignee: 'Bob Wilson' }
  ]

  const mockMembers: MockUser[] = [
    { id: 'user-1', name: 'John Doe', email: 'john@company.com', role: 'ADMIN' },
    { id: 'user-2', name: 'Jane Smith', email: 'jane@company.com', role: 'MEMBER' },
    { id: 'user-3', name: 'Bob Wilson', email: 'bob@company.com', role: 'MEMBER' }
  ]

  describe('Service List Management', () => {
    it('displays all services with stats', () => {
      const mockOnCreateNew = jest.fn()
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()
      
      render(
        <MockServiceList 
          services={mockServices}
          onCreateNew={mockOnCreateNew}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          userRole="ADMIN"
        />
      )

      expect(screen.getByTestId('services-list')).toBeInTheDocument()
      expect(screen.getByText('Services (3)')).toBeInTheDocument()
      
      // Check all services are displayed
      expect(screen.getByTestId('service-service-1')).toBeInTheDocument()
      expect(screen.getByTestId('service-service-2')).toBeInTheDocument()
      expect(screen.getByTestId('service-service-3')).toBeInTheDocument()
      
      // Check stats are displayed
      expect(screen.getByTestId('task-count-service-1')).toHaveTextContent('15 tasks')
      expect(screen.getByTestId('member-count-service-1')).toHaveTextContent('4 members')
    })

    it('shows admin controls for admin users', () => {
      const mockOnCreateNew = jest.fn()
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()
      
      render(
        <MockServiceList 
          services={mockServices}
          onCreateNew={mockOnCreateNew}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          userRole="ADMIN"
        />
      )

      expect(screen.getByTestId('create-new-service')).toBeInTheDocument()
      expect(screen.getByTestId('edit-service-service-1')).toBeInTheDocument()
      expect(screen.getByTestId('delete-service-service-1')).toBeInTheDocument()
    })

    it('hides admin controls for non-admin users', () => {
      const mockOnCreateNew = jest.fn()
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()
      
      render(
        <MockServiceList 
          services={mockServices}
          onCreateNew={mockOnCreateNew}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          userRole="MEMBER"
        />
      )

      expect(screen.queryByTestId('create-new-service')).not.toBeInTheDocument()
      expect(screen.queryByTestId('edit-service-service-1')).not.toBeInTheDocument()
      expect(screen.queryByTestId('delete-service-service-1')).not.toBeInTheDocument()
      expect(screen.getByTestId('services-readonly')).toBeInTheDocument()
    })

    it('shows empty state when no services', () => {
      const mockOnCreateNew = jest.fn()
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()
      
      render(
        <MockServiceList 
          services={[]}
          onCreateNew={mockOnCreateNew}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          userRole="ADMIN"
        />
      )

      expect(screen.getByTestId('no-services')).toBeInTheDocument()
      expect(screen.getByText('No Services')).toBeInTheDocument()
      expect(screen.getByTestId('create-first-service')).toBeInTheDocument()
    })

    it('shows loading state', () => {
      const mockOnCreateNew = jest.fn()
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()
      
      render(
        <MockServiceList 
          services={[]}
          onCreateNew={mockOnCreateNew}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          userRole="ADMIN"
          isLoading={true}
        />
      )

      expect(screen.getByTestId('services-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading services...')).toBeInTheDocument()
    })

    it('handles service actions', async () => {
      const user = userEvent.setup()
      const mockOnCreateNew = jest.fn()
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()
      
      render(
        <MockServiceList 
          services={mockServices}
          onCreateNew={mockOnCreateNew}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          userRole="ADMIN"
        />
      )

      await user.click(screen.getByTestId('create-new-service'))
      expect(mockOnCreateNew).toHaveBeenCalled()

      await user.click(screen.getByTestId('edit-service-service-1'))
      expect(mockOnEdit).toHaveBeenCalledWith(mockServices[0])

      await user.click(screen.getByTestId('delete-service-service-1'))
      expect(mockOnDelete).toHaveBeenCalledWith('service-1')
    })
  })

  describe('Service Form Management', () => {
    it('creates new service with valid data', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <MockServiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('Create New Service')).toBeInTheDocument()

      await user.type(screen.getByLabelText(/service name/i), 'Quality Assurance')
      await user.click(screen.getByTestId('submit-service-form'))

      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Quality Assurance'
      })
    })

    it('edits existing service', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <MockServiceForm 
          service={mockServices[0]}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('Edit Service')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Frontend Development')).toBeInTheDocument()

      await user.clear(screen.getByLabelText(/service name/i))
      await user.type(screen.getByLabelText(/service name/i), 'Frontend Engineering')
      await user.click(screen.getByTestId('submit-service-form'))

      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Frontend Engineering'
      })
    })

    it('validates service name requirements', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <MockServiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      const nameInput = screen.getByLabelText(/service name/i)
      const submitButton = screen.getByTestId('submit-service-form')

      // Empty name
      expect(submitButton).toBeDisabled()

      // Too short
      await user.type(nameInput, 'A')
      await user.tab() // Trigger blur to show validation
      await waitFor(() => {
        expect(screen.getByTestId('name-error')).toHaveTextContent('Service name must be at least 2 characters')
      })
      expect(submitButton).toBeDisabled()

      // Valid length
      await user.clear(nameInput)
      await user.type(nameInput, 'Valid Service')
      await waitFor(() => {
        expect(screen.queryByTestId('name-error')).not.toBeInTheDocument()
      })
      expect(submitButton).not.toBeDisabled()

      // Too long
      await user.clear(nameInput)
      await user.type(nameInput, 'A'.repeat(51))
      await user.tab()
      await waitFor(() => {
        expect(screen.getByTestId('name-error')).toHaveTextContent('Service name must be less than 50 characters')
      })
      expect(submitButton).toBeDisabled()
    })

    it('shows character count', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <MockServiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('0/50 characters')).toBeInTheDocument()

      await user.type(screen.getByLabelText(/service name/i), 'Test')
      expect(screen.getByText('4/50 characters')).toBeInTheDocument()
    })

    it('displays form errors', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <MockServiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          error="Service name already exists in this workspace"
        />
      )

      expect(screen.getByTestId('form-error')).toBeInTheDocument()
      expect(screen.getByText('Service name already exists in this workspace')).toBeInTheDocument()
    })

    it('handles form cancellation', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <MockServiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      await user.click(screen.getByTestId('cancel-service-form'))
      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('shows loading state during submission', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <MockServiceForm 
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isPending={true}
        />
      )

      expect(screen.getByText('Creating...')).toBeInTheDocument()
      expect(screen.getByLabelText(/service name/i)).toBeDisabled()
      expect(screen.getByTestId('submit-service-form')).toBeDisabled()
      expect(screen.getByTestId('cancel-service-form')).toBeDisabled()
    })
  })

  describe('Service Detail View', () => {
    it('displays service information and stats', () => {
      const mockOnUpdateService = jest.fn()
      const mockOnDeleteService = jest.fn()
      const mockOnCreateTask = jest.fn()
      
      render(
        <MockServiceDetail 
          service={mockServices[0]}
          tasks={mockTasks}
          members={mockMembers}
          onUpdateService={mockOnUpdateService}
          onDeleteService={mockOnDeleteService}
          onCreateTask={mockOnCreateTask}
          userRole="ADMIN"
        />
      )

      expect(screen.getByText('Frontend Development')).toBeInTheDocument()
      expect(screen.getByTestId('total-tasks')).toHaveTextContent('3')
      expect(screen.getByTestId('active-tasks')).toHaveTextContent('2') // TODO + IN_PROGRESS
      expect(screen.getByTestId('completed-tasks')).toHaveTextContent('1') // DONE
      expect(screen.getByTestId('team-members')).toHaveTextContent('3')
    })

    it('shows admin controls for admins', () => {
      const mockOnUpdateService = jest.fn()
      const mockOnDeleteService = jest.fn()
      const mockOnCreateTask = jest.fn()
      
      render(
        <MockServiceDetail 
          service={mockServices[0]}
          tasks={mockTasks}
          members={mockMembers}
          onUpdateService={mockOnUpdateService}
          onDeleteService={mockOnDeleteService}
          onCreateTask={mockOnCreateTask}
          userRole="ADMIN"
        />
      )

      expect(screen.getByTestId('update-service-btn')).toBeInTheDocument()
      expect(screen.getByTestId('delete-service-btn')).toBeInTheDocument()
    })

    it('hides admin controls for non-admins', () => {
      const mockOnUpdateService = jest.fn()
      const mockOnDeleteService = jest.fn()
      const mockOnCreateTask = jest.fn()
      
      render(
        <MockServiceDetail 
          service={mockServices[0]}
          tasks={mockTasks}
          members={mockMembers}
          onUpdateService={mockOnUpdateService}
          onDeleteService={mockOnDeleteService}
          onCreateTask={mockOnCreateTask}
          userRole="MEMBER"
        />
      )

      expect(screen.queryByTestId('update-service-btn')).not.toBeInTheDocument()
      expect(screen.queryByTestId('delete-service-btn')).not.toBeInTheDocument()
      expect(screen.getByTestId('service-readonly')).toBeInTheDocument()
    })

    it('handles service deletion with confirmation', async () => {
      const user = userEvent.setup()
      const mockOnUpdateService = jest.fn()
      const mockOnDeleteService = jest.fn()
      const mockOnCreateTask = jest.fn()
      
      render(
        <MockServiceDetail 
          service={mockServices[0]}
          tasks={mockTasks}
          members={mockMembers}
          onUpdateService={mockOnUpdateService}
          onDeleteService={mockOnDeleteService}
          onCreateTask={mockOnCreateTask}
          userRole="ADMIN"
        />
      )

      await user.click(screen.getByTestId('delete-service-btn'))
      expect(screen.getByTestId('delete-confirmation')).toBeInTheDocument()

      await user.click(screen.getByTestId('confirm-delete-service'))
      expect(mockOnDeleteService).toHaveBeenCalled()
    })

    it('displays tasks and members', () => {
      const mockOnUpdateService = jest.fn()
      const mockOnDeleteService = jest.fn()
      const mockOnCreateTask = jest.fn()
      
      render(
        <MockServiceDetail 
          service={mockServices[0]}
          tasks={mockTasks}
          members={mockMembers}
          onUpdateService={mockOnUpdateService}
          onDeleteService={mockOnDeleteService}
          onCreateTask={mockOnCreateTask}
          userRole="ADMIN"
        />
      )

      expect(screen.getByTestId('tasks-list')).toBeInTheDocument()
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument()
      expect(screen.getByTestId('members-list')).toBeInTheDocument()
      expect(screen.getByTestId('member-user-1')).toBeInTheDocument()
    })

    it('shows empty state for no tasks', () => {
      const mockOnUpdateService = jest.fn()
      const mockOnDeleteService = jest.fn()
      const mockOnCreateTask = jest.fn()
      
      render(
        <MockServiceDetail 
          service={mockServices[0]}
          tasks={[]}
          members={mockMembers}
          onUpdateService={mockOnUpdateService}
          onDeleteService={mockOnDeleteService}
          onCreateTask={mockOnCreateTask}
          userRole="ADMIN"
        />
      )

      expect(screen.getByTestId('no-tasks')).toBeInTheDocument()
      expect(screen.getByText('No tasks in this service yet.')).toBeInTheDocument()
    })

    it('allows task creation for authorized users', async () => {
      const user = userEvent.setup()
      const mockOnUpdateService = jest.fn()
      const mockOnDeleteService = jest.fn()
      const mockOnCreateTask = jest.fn()
      
      render(
        <MockServiceDetail 
          service={mockServices[0]}
          tasks={mockTasks}
          members={mockMembers}
          onUpdateService={mockOnUpdateService}
          onDeleteService={mockOnDeleteService}
          onCreateTask={mockOnCreateTask}
          userRole="MEMBER"
        />
      )

      await user.click(screen.getByTestId('create-task-btn'))
      expect(mockOnCreateTask).toHaveBeenCalled()
    })

    it('restricts task creation for visitors', () => {
      const mockOnUpdateService = jest.fn()
      const mockOnDeleteService = jest.fn()
      const mockOnCreateTask = jest.fn()
      
      render(
        <MockServiceDetail 
          service={mockServices[0]}
          tasks={mockTasks}
          members={mockMembers}
          onUpdateService={mockOnUpdateService}
          onDeleteService={mockOnDeleteService}
          onCreateTask={mockOnCreateTask}
          userRole="VISITOR"
        />
      )

      expect(screen.queryByTestId('create-task-btn')).not.toBeInTheDocument()
    })
  })

  describe('Service Switcher', () => {
    it('displays current service and dropdown', async () => {
      const user = userEvent.setup()
      const mockOnServiceChange = jest.fn()
      
      render(
        <MockServiceSwitcher 
          services={mockServices}
          currentServiceId="service-1"
          onServiceChange={mockOnServiceChange}
        />
      )

      expect(screen.getByText('Frontend Development')).toBeInTheDocument()

      await user.click(screen.getByTestId('service-switcher-button'))
      expect(screen.getByTestId('service-dropdown')).toBeInTheDocument()
    })

    it('switches between services', async () => {
      const user = userEvent.setup()
      const mockOnServiceChange = jest.fn()
      
      render(
        <MockServiceSwitcher 
          services={mockServices}
          currentServiceId="service-1"
          onServiceChange={mockOnServiceChange}
        />
      )

      await user.click(screen.getByTestId('service-switcher-button'))
      await user.click(screen.getByTestId('service-option-service-2'))

      expect(mockOnServiceChange).toHaveBeenCalledWith('service-2')
    })

    it('shows service stats in dropdown', async () => {
      const user = userEvent.setup()
      const mockOnServiceChange = jest.fn()
      
      render(
        <MockServiceSwitcher 
          services={mockServices}
          currentServiceId="service-1"
          onServiceChange={mockOnServiceChange}
        />
      )

      await user.click(screen.getByTestId('service-switcher-button'))
      
      expect(screen.getByText('15 tasks')).toBeInTheDocument()
      expect(screen.getByText('12 tasks')).toBeInTheDocument()
      expect(screen.getByText('8 tasks')).toBeInTheDocument()
    })

    it('highlights current service in dropdown', async () => {
      const user = userEvent.setup()
      const mockOnServiceChange = jest.fn()
      
      render(
        <MockServiceSwitcher 
          services={mockServices}
          currentServiceId="service-1"
          onServiceChange={mockOnServiceChange}
        />
      )

      await user.click(screen.getByTestId('service-switcher-button'))
      
      const currentOption = screen.getByTestId('service-option-service-1')
      expect(currentOption).toHaveClass('active')
    })

    it('handles no current service selected', () => {
      const mockOnServiceChange = jest.fn()
      
      render(
        <MockServiceSwitcher 
          services={mockServices}
          currentServiceId={null}
          onServiceChange={mockOnServiceChange}
        />
      )

      expect(screen.getByText('Select Service')).toBeInTheDocument()
    })
  })

  describe('Service Integration', () => {
    it('handles complete service lifecycle', async () => {
      const user = userEvent.setup()
      
      // Mock the complete service workflow
      let currentServices = [...mockServices]
      
      const handleCreateService = (serviceData: { name: string }) => {
        const newService: MockService = {
          id: `service-${Date.now()}`,
          name: serviceData.name,
          workspaceId: 'ws-1',
          createdAt: new Date().toISOString(),
          taskCount: 0,
          memberCount: 0
        }
        currentServices.push(newService)
      }

      const handleDeleteService = (serviceId: string) => {
        currentServices = currentServices.filter(s => s.id !== serviceId)
      }

      // Test service creation
      expect(currentServices).toHaveLength(3)
      handleCreateService({ name: 'New Service' })
      expect(currentServices).toHaveLength(4)
      expect(currentServices[3].name).toBe('New Service')

      // Test service deletion
      handleDeleteService('service-1')
      expect(currentServices).toHaveLength(3)
      expect(currentServices.find(s => s.id === 'service-1')).toBeUndefined()
    })
  })

  describe('Service Validation', () => {
    it('validates service name uniqueness', () => {
      const existingNames = mockServices.map(s => s.name.toLowerCase())
      
      const isNameUnique = (name: string) => {
        return !existingNames.includes(name.toLowerCase())
      }
      
      expect(isNameUnique('New Service')).toBe(true)
      expect(isNameUnique('Frontend Development')).toBe(false)
      expect(isNameUnique('frontend development')).toBe(false) // Case insensitive
    })

    it('validates service name format', () => {
      const isValidName = (name: string) => {
        const trimmed = name.trim()
        return trimmed.length >= 2 && trimmed.length <= 50
      }
      
      expect(isValidName('Valid Service')).toBe(true)
      expect(isValidName('A')).toBe(false) // Too short
      expect(isValidName('A'.repeat(51))).toBe(false) // Too long
      expect(isValidName('  Valid  ')).toBe(true) // Spaces trimmed
      expect(isValidName('')).toBe(false) // Empty
    })

    it('validates workspace association', () => {
      const validateWorkspaceAssociation = (service: MockService, workspaceId: string) => {
        return service.workspaceId === workspaceId
      }
      
      expect(validateWorkspaceAssociation(mockServices[0], 'ws-1')).toBe(true)
      expect(validateWorkspaceAssociation(mockServices[0], 'ws-2')).toBe(false)
    })
  })
})
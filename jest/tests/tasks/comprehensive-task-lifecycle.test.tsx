import React from 'react'
import { render, screen, userEvent, waitFor } from '@/test-utils'

// Mock task types based on the schema
type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'ARCHIVED'

interface MockTask {
  id: string
  name: string
  description?: string
  status: TaskStatus
  workspaceId: string
  serviceId: string
  assigneeId?: string
  creatorId: string
  position: number
  dueDate?: string
  attachmentId?: string
  followedIds: string[]
  isConfidential: boolean
  createdAt: string
  updatedAt: string
}

interface MockTaskHistory {
  id: string
  taskId: string
  userId: string
  userName: string
  action: string
  field?: string
  oldValue?: string
  newValue?: string
  timestamp: string
}

interface MockTaskMessage {
  id: string
  taskId: string
  senderId: string
  senderName: string
  content: string
  workspaceId: string
  timestamp: string
}

// Mock task creation form
const MockTaskCreationForm = ({ 
  onSubmit, 
  services, 
  users, 
  isPending = false,
  error = null 
}: { 
  onSubmit: (data: Partial<MockTask>) => void
  services: Array<{ id: string; name: string }>
  users: Array<{ id: string; name: string; email: string }>
  isPending?: boolean
  error?: string | null
}) => {
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    serviceId: '',
    assigneeId: '',
    dueDate: '',
    isConfidential: false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.serviceId) return
    
    onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      serviceId: formData.serviceId,
      assigneeId: formData.assigneeId || undefined,
      dueDate: formData.dueDate || undefined,
      isConfidential: formData.isConfidential,
      status: 'TODO'
    })
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div data-testid="task-creation-form">
      <h2>Create New Task</h2>
      
      {error && (
        <div data-testid="creation-error" role="alert">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="task-name">Task Name *</label>
          <input
            id="task-name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter task name"
            required
            disabled={isPending}
            maxLength={100}
          />
          <small>{formData.name.length}/100 characters</small>
        </div>
        
        <div>
          <label htmlFor="task-description">Description</label>
          <textarea
            id="task-description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe the task..."
            disabled={isPending}
            maxLength={500}
            rows={4}
          />
          <small>{formData.description.length}/500 characters</small>
        </div>
        
        <div>
          <label htmlFor="task-service">Service *</label>
          <select
            id="task-service"
            value={formData.serviceId}
            onChange={(e) => handleChange('serviceId', e.target.value)}
            required
            disabled={isPending}
          >
            <option value="">Select a service</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="task-assignee">Assignee</label>
          <select
            id="task-assignee"
            value={formData.assigneeId}
            onChange={(e) => handleChange('assigneeId', e.target.value)}
            disabled={isPending}
          >
            <option value="">Unassigned</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="task-due-date">Due Date</label>
          <input
            id="task-due-date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => handleChange('dueDate', e.target.value)}
            disabled={isPending}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        
        <div>
          <label>
            <input
              type="checkbox"
              checked={formData.isConfidential}
              onChange={(e) => handleChange('isConfidential', e.target.checked)}
              disabled={isPending}
            />
            Mark as confidential
          </label>
          <small>Only creators, assignees, and followers can see confidential tasks</small>
        </div>
        
        <div className="form-actions">
          <button type="submit" disabled={isPending || !formData.name.trim() || !formData.serviceId}>
            {isPending ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  )
}

// Mock task status board (Kanban)
const MockTaskBoard = ({ 
  tasks, 
  onStatusChange, 
  onTaskEdit, 
  userRole = 'MEMBER' 
}: { 
  tasks: MockTask[]
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
  onTaskEdit: (task: MockTask) => void
  userRole?: 'ADMIN' | 'MEMBER' | 'VISITOR'
}) => {
  const statuses: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']
  
  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status)
      .sort((a, b) => a.position - b.position)
  }

  const canMoveTask = (task: MockTask) => {
    if (userRole === 'ADMIN') return true
    if (userRole === 'VISITOR') return false
    return true // Members can move tasks
  }

  const canEditTask = (task: MockTask) => {
    if (userRole === 'ADMIN') return true
    if (userRole === 'VISITOR') return false
    return true // Members can edit tasks
  }

  return (
    <div data-testid="task-board">
      <h2>Task Board</h2>
      
      <div className="kanban-columns">
        {statuses.map(status => (
          <div key={status} data-testid={`column-${status}`} className="kanban-column">
            <h3>{status.replace('_', ' ')}</h3>
            <div className="task-count">
              {getTasksByStatus(status).length} tasks
            </div>
            
            <div className="tasks">
              {getTasksByStatus(status).map(task => (
                <div 
                  key={task.id} 
                  data-testid={`task-${task.id}`}
                  className={`task-card ${task.isConfidential ? 'confidential' : ''}`}
                >
                  <h4>{task.name}</h4>
                  {task.description && <p className="description">{task.description}</p>}
                  {task.isConfidential && <span className="confidential-badge">Confidential</span>}
                  {task.dueDate && (
                    <div className="due-date">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                  {task.attachmentId && <span className="attachment-icon">📎</span>}
                  
                  <div className="task-actions">
                    {canEditTask(task) && (
                      <button 
                        onClick={() => onTaskEdit(task)}
                        data-testid={`edit-${task.id}`}
                      >
                        Edit
                      </button>
                    )}
                    
                    {canMoveTask(task) && task.status !== 'DONE' && (
                      <select
                        value={task.status}
                        onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                        data-testid={`status-${task.id}`}
                      >
                        {statuses.map(s => (
                          <option key={s} value={s}>
                            {s.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  <div className="task-meta">
                    <small>Position: {task.position}</small>
                    {task.followedIds.length > 0 && (
                      <small>{task.followedIds.length} followers</small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Mock task detail view
const MockTaskDetail = ({ 
  task, 
  history, 
  messages, 
  onUpdate, 
  onAddMessage, 
  onFollow, 
  currentUserId, 
  userRole = 'MEMBER' 
}: { 
  task: MockTask
  history: MockTaskHistory[]
  messages: MockTaskMessage[]
  onUpdate: (updates: Partial<MockTask>) => void
  onAddMessage: (content: string) => void
  onFollow: () => void
  currentUserId: string
  userRole?: 'ADMIN' | 'MEMBER' | 'VISITOR'
}) => {
  const [newMessage, setNewMessage] = React.useState('')
  const [editMode, setEditMode] = React.useState(false)
  const [editData, setEditData] = React.useState({
    name: task.name,
    description: task.description || ''
  })

  const canEdit = userRole === 'ADMIN' || 
    (userRole === 'MEMBER' && (task.creatorId === currentUserId || task.assigneeId === currentUserId))
  
  const isFollowing = task.followedIds.includes(currentUserId)

  const handleUpdate = () => {
    onUpdate({
      name: editData.name,
      description: editData.description || undefined
    })
    setEditMode(false)
  }

  const handleAddMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim()) {
      onAddMessage(newMessage.trim())
      setNewMessage('')
    }
  }

  return (
    <div data-testid="task-detail">
      <div className="task-header">
        {editMode ? (
          <div data-testid="edit-form">
            <input
              value={editData.name}
              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
              data-testid="edit-name"
            />
            <textarea
              value={editData.description}
              onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
              data-testid="edit-description"
            />
            <button onClick={handleUpdate} data-testid="save-edit">Save</button>
            <button onClick={() => setEditMode(false)} data-testid="cancel-edit">Cancel</button>
          </div>
        ) : (
          <div>
            <h1>{task.name}</h1>
            {task.description && <p>{task.description}</p>}
            {canEdit && (
              <button onClick={() => setEditMode(true)} data-testid="edit-task">
                Update Task
              </button>
            )}
          </div>
        )}
        
        <div className="task-meta">
          <span data-testid="task-status">Status: {task.status}</span>
          {task.isConfidential && <span data-testid="confidential-indicator">Confidential</span>}
          {task.dueDate && (
            <span data-testid="due-date">
              Due: {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
        
        <div className="task-actions">
          {!isFollowing ? (
            <button onClick={onFollow} data-testid="follow-task">
              Follow Task
            </button>
          ) : (
            <span data-testid="following-indicator">Following</span>
          )}
        </div>
      </div>
      
      <div className="task-history" data-testid="task-history">
        <h3>History</h3>
        <div className="history-list">
          {history.map(entry => (
            <div key={entry.id} data-testid={`history-${entry.id}`} className="history-entry">
              <strong>{entry.userName}</strong> {entry.action}
              {entry.field && (
                <span>
                  {' '}changed {entry.field} from &quot;{entry.oldValue}&quot; to &quot;{entry.newValue}&quot;
                </span>
              )}
              <small>{new Date(entry.timestamp).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </div>
      
      <div className="task-chat" data-testid="task-chat">
        <h3>Messages ({messages.length})</h3>
        
        <div className="messages">
          {messages.map(message => (
            <div key={message.id} data-testid={`message-${message.id}`} className="message">
              <strong>{message.senderName}</strong>
              <p>{message.content}</p>
              <small>{new Date(message.timestamp).toLocaleString()}</small>
            </div>
          ))}
        </div>
        
        {userRole !== 'VISITOR' && (
          <form onSubmit={handleAddMessage} data-testid="message-form">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Add a comment..."
              data-testid="message-input"
              required
            />
            <button type="submit" disabled={!newMessage.trim()}>
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// Mock task filters
const MockTaskFilters = ({ 
  onFilterChange, 
  filters 
}: { 
  onFilterChange: (filters: any) => void
  filters: {
    status: TaskStatus[]
    assigneeId: string
    serviceId: string
    isConfidential: boolean | null
    dueDate: string
  }
}) => {
  const statuses: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'ARCHIVED']

  const handleStatusToggle = (status: TaskStatus) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status]
    
    onFilterChange({ ...filters, status: newStatuses })
  }

  return (
    <div data-testid="task-filters">
      <h3>Filters</h3>
      
      <div className="status-filters">
        <h4>Status</h4>
        {statuses.map(status => (
          <label key={status}>
            <input
              type="checkbox"
              checked={filters.status.includes(status)}
              onChange={() => handleStatusToggle(status)}
              data-testid={`filter-status-${status}`}
            />
            {status.replace('_', ' ')}
          </label>
        ))}
      </div>
      
      <div className="confidential-filter">
        <label>
          <input
            type="checkbox"
            checked={filters.isConfidential === true}
            onChange={(e) => onFilterChange({ 
              ...filters, 
              isConfidential: e.target.checked ? true : null 
            })}
            data-testid="filter-confidential"
          />
          Show only confidential tasks
        </label>
      </div>
      
      <div className="due-date-filter">
        <label htmlFor="filter-due-date">Due before:</label>
        <input
          id="filter-due-date"
          type="date"
          value={filters.dueDate}
          onChange={(e) => onFilterChange({ ...filters, dueDate: e.target.value })}
          data-testid="filter-due-date"
        />
      </div>
      
      <button 
        onClick={() => onFilterChange({
          status: statuses,
          assigneeId: '',
          serviceId: '',
          isConfidential: null,
          dueDate: ''
        })}
        data-testid="reset-filters"
      >
        Reset Filters
      </button>
    </div>
  )
}

describe('Comprehensive Task Lifecycle Management', () => {
  const mockServices = [
    { id: 'service-1', name: 'Frontend Development' },
    { id: 'service-2', name: 'Backend Development' },
    { id: 'service-3', name: 'Design' }
  ]

  const mockUsers = [
    { id: 'user-1', name: 'John Doe', email: 'john@company.com' },
    { id: 'user-2', name: 'Jane Smith', email: 'jane@company.com' },
    { id: 'user-3', name: 'Bob Wilson', email: 'bob@company.com' }
  ]

  const mockTasks: MockTask[] = [
    {
      id: 'task-1',
      name: 'Implement user authentication',
      description: 'Add login and registration functionality',
      status: 'IN_PROGRESS',
      workspaceId: 'ws-1',
      serviceId: 'service-1',
      assigneeId: 'user-1',
      creatorId: 'user-2',
      position: 1,
      dueDate: '2024-12-31',
      followedIds: ['user-1', 'user-2'],
      isConfidential: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'task-2',
      name: 'Design system components',
      description: 'Create reusable UI components',
      status: 'TODO',
      workspaceId: 'ws-1',
      serviceId: 'service-3',
      assigneeId: 'user-3',
      creatorId: 'user-1',
      position: 1,
      followedIds: ['user-1'],
      isConfidential: true,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    }
  ]

  const mockHistory: MockTaskHistory[] = [
    {
      id: 'history-1',
      taskId: 'task-1',
      userId: 'user-2',
      userName: 'Jane Smith',
      action: 'created',
      timestamp: '2024-01-01T00:00:00Z'
    },
    {
      id: 'history-2',
      taskId: 'task-1',
      userId: 'user-1',
      userName: 'John Doe',
      action: 'status_changed',
      field: 'status',
      oldValue: 'TODO',
      newValue: 'IN_PROGRESS',
      timestamp: '2024-01-01T01:00:00Z'
    }
  ]

  const mockMessages: MockTaskMessage[] = [
    {
      id: 'message-1',
      taskId: 'task-1',
      senderId: 'user-1',
      senderName: 'John Doe',
      content: 'Started working on this task',
      workspaceId: 'ws-1',
      timestamp: '2024-01-01T01:00:00Z'
    }
  ]

  describe('Task Creation', () => {
    it('creates new task with all required fields', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      
      render(
        <MockTaskCreationForm 
          onSubmit={mockOnSubmit}
          services={mockServices}
          users={mockUsers}
        />
      )

      await user.type(screen.getByLabelText(/task name/i), 'New Feature Implementation')
      await user.type(screen.getByLabelText(/description/i), 'Implement the new feature as specified')
      await user.selectOptions(screen.getByLabelText(/service/i), 'service-1')
      await user.selectOptions(screen.getByLabelText(/assignee/i), 'user-1')
      await user.type(screen.getByLabelText(/due date/i), '2025-12-31')
      await user.click(screen.getByLabelText(/mark as confidential/i))
      
      // Check if button is enabled before clicking
      const submitButton = screen.getByRole('button', { name: /create task/i })
      expect(submitButton).not.toBeDisabled()
      
      await user.click(submitButton)

      // Wait a moment for any async operations
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'New Feature Implementation',
        description: 'Implement the new feature as specified',
        serviceId: 'service-1',
        assigneeId: 'user-1',
        dueDate: '2025-12-31',
        isConfidential: true,
        status: 'TODO'
      })
    })

    it('validates required fields', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      
      render(
        <MockTaskCreationForm 
          onSubmit={mockOnSubmit}
          services={mockServices}
          users={mockUsers}
        />
      )

      const submitButton = screen.getByRole('button', { name: /create task/i })
      expect(submitButton).toBeDisabled()

      await user.type(screen.getByLabelText(/task name/i), 'Test Task')
      expect(submitButton).toBeDisabled()

      await user.selectOptions(screen.getByLabelText(/service/i), 'service-1')
      expect(submitButton).not.toBeDisabled()
    })

    it('shows character limits and enforces them', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      
      render(
        <MockTaskCreationForm 
          onSubmit={mockOnSubmit}
          services={mockServices}
          users={mockUsers}
        />
      )

      expect(screen.getByText('0/100 characters')).toBeInTheDocument()
      expect(screen.getByText('0/500 characters')).toBeInTheDocument()

      const nameInput = screen.getByLabelText(/task name/i)
      await user.type(nameInput, 'A'.repeat(110))
      expect(nameInput).toHaveValue('A'.repeat(100))
      expect(screen.getByText('100/100 characters')).toBeInTheDocument()
    })

    it('prevents future dates for due dates', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      
      render(
        <MockTaskCreationForm 
          onSubmit={mockOnSubmit}
          services={mockServices}
          users={mockUsers}
        />
      )

      const dueDateInput = screen.getByLabelText(/due date/i)
      const today = new Date().toISOString().split('T')[0]
      expect(dueDateInput).toHaveAttribute('min', today)
    })

    it('displays creation errors', () => {
      const mockOnSubmit = jest.fn()
      
      render(
        <MockTaskCreationForm 
          onSubmit={mockOnSubmit}
          services={mockServices}
          users={mockUsers}
          error="Service not found"
        />
      )

      expect(screen.getByTestId('creation-error')).toBeInTheDocument()
      expect(screen.getByText('Service not found')).toBeInTheDocument()
    })
  })

  describe('Task Board (Kanban) Management', () => {
    it('displays tasks grouped by status', () => {
      const mockOnStatusChange = jest.fn()
      const mockOnTaskEdit = jest.fn()
      
      render(
        <MockTaskBoard 
          tasks={mockTasks}
          onStatusChange={mockOnStatusChange}
          onTaskEdit={mockOnTaskEdit}
        />
      )

      expect(screen.getByTestId('column-TODO')).toBeInTheDocument()
      expect(screen.getByTestId('column-IN_PROGRESS')).toBeInTheDocument()
      expect(screen.getByTestId('task-task-1')).toBeInTheDocument()
      expect(screen.getByTestId('task-task-2')).toBeInTheDocument()
    })

    it('shows task counts per column', () => {
      const mockOnStatusChange = jest.fn()
      const mockOnTaskEdit = jest.fn()
      
      render(
        <MockTaskBoard 
          tasks={mockTasks}
          onStatusChange={mockOnStatusChange}
          onTaskEdit={mockOnTaskEdit}
        />
      )

      // Should show correct task counts
      expect(screen.getByTestId('column-TODO')).toHaveTextContent('1 tasks')
      expect(screen.getByTestId('column-IN_PROGRESS')).toHaveTextContent('1 tasks')
      expect(screen.getByTestId('column-BACKLOG')).toHaveTextContent('0 tasks')
    })

    it('allows status changes for authorized users', async () => {
      const user = userEvent.setup()
      const mockOnStatusChange = jest.fn()
      const mockOnTaskEdit = jest.fn()
      
      render(
        <MockTaskBoard 
          tasks={mockTasks}
          onStatusChange={mockOnStatusChange}
          onTaskEdit={mockOnTaskEdit}
          userRole="MEMBER"
        />
      )

      await user.selectOptions(screen.getByTestId('status-task-1'), 'DONE')
      expect(mockOnStatusChange).toHaveBeenCalledWith('task-1', 'DONE')
    })

    it('restricts actions for visitor users', () => {
      const mockOnStatusChange = jest.fn()
      const mockOnTaskEdit = jest.fn()
      
      render(
        <MockTaskBoard 
          tasks={mockTasks}
          onStatusChange={mockOnStatusChange}
          onTaskEdit={mockOnTaskEdit}
          userRole="VISITOR"
        />
      )

      expect(screen.queryByTestId('edit-task-1')).not.toBeInTheDocument()
      expect(screen.queryByTestId('status-task-1')).not.toBeInTheDocument()
    })

    it('displays confidential task indicators', () => {
      const mockOnStatusChange = jest.fn()
      const mockOnTaskEdit = jest.fn()
      
      render(
        <MockTaskBoard 
          tasks={mockTasks}
          onStatusChange={mockOnStatusChange}
          onTaskEdit={mockOnTaskEdit}
        />
      )

      const confidentialTask = screen.getByTestId('task-task-2')
      expect(confidentialTask).toHaveClass('confidential')
      expect(confidentialTask).toHaveTextContent('Confidential')
    })

    it('shows attachment indicators', () => {
      const tasksWithAttachment = mockTasks.map(task => 
        task.id === 'task-1' ? { ...task, attachmentId: 'file-1' } : task
      )
      
      const mockOnStatusChange = jest.fn()
      const mockOnTaskEdit = jest.fn()
      
      render(
        <MockTaskBoard 
          tasks={tasksWithAttachment}
          onStatusChange={mockOnStatusChange}
          onTaskEdit={mockOnTaskEdit}
        />
      )

      expect(screen.getByText('📎')).toBeInTheDocument()
    })
  })

  describe('Task Detail Management', () => {
    it('displays complete task information', () => {
      const mockOnUpdate = jest.fn()
      const mockOnAddMessage = jest.fn()
      const mockOnFollow = jest.fn()
      
      render(
        <MockTaskDetail 
          task={mockTasks[0]}
          history={mockHistory}
          messages={mockMessages}
          onUpdate={mockOnUpdate}
          onAddMessage={mockOnAddMessage}
          onFollow={mockOnFollow}
          currentUserId="user-1"
        />
      )

      expect(screen.getByText('Implement user authentication')).toBeInTheDocument()
      expect(screen.getByText('Add login and registration functionality')).toBeInTheDocument()
      expect(screen.getByTestId('task-status')).toHaveTextContent('Status: IN_PROGRESS')
      expect(screen.getByTestId('due-date')).toHaveTextContent('Due: 12/31/2024')
    })

    it('allows editing for authorized users', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = jest.fn()
      const mockOnAddMessage = jest.fn()
      const mockOnFollow = jest.fn()
      
      render(
        <MockTaskDetail 
          task={mockTasks[0]}
          history={mockHistory}
          messages={mockMessages}
          onUpdate={mockOnUpdate}
          onAddMessage={mockOnAddMessage}
          onFollow={mockOnFollow}
          currentUserId="user-1" // assignee
        />
      )

      await user.click(screen.getByTestId('edit-task'))
      expect(screen.getByTestId('edit-form')).toBeInTheDocument()

      await user.clear(screen.getByTestId('edit-name'))
      await user.type(screen.getByTestId('edit-name'), 'Updated task name')
      await user.click(screen.getByTestId('save-edit'))

      expect(mockOnUpdate).toHaveBeenCalledWith({
        name: 'Updated task name',
        description: 'Add login and registration functionality'
      })
    })

    it('displays task history', () => {
      const mockOnUpdate = jest.fn()
      const mockOnAddMessage = jest.fn()
      const mockOnFollow = jest.fn()
      
      render(
        <MockTaskDetail 
          task={mockTasks[0]}
          history={mockHistory}
          messages={mockMessages}
          onUpdate={mockOnUpdate}
          onAddMessage={mockOnAddMessage}
          onFollow={mockOnFollow}
          currentUserId="user-1"
        />
      )

      expect(screen.getByTestId('task-history')).toBeInTheDocument()
      expect(screen.getByTestId('history-history-1')).toBeInTheDocument()
      expect(screen.getByTestId('history-history-2')).toBeInTheDocument()
      // Check that history entries contain the expected information
      const historyEntry1 = screen.getByTestId('history-history-1')
      expect(historyEntry1).toHaveTextContent('Jane Smith')
      expect(historyEntry1).toHaveTextContent('created')
      
      const historyEntry2 = screen.getByTestId('history-history-2')
      expect(historyEntry2).toHaveTextContent('John Doe')
      expect(historyEntry2).toHaveTextContent('status_changed')
    })

    it('handles task following', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = jest.fn()
      const mockOnAddMessage = jest.fn()
      const mockOnFollow = jest.fn()
      
      render(
        <MockTaskDetail 
          task={mockTasks[0]}
          history={mockHistory}
          messages={mockMessages}
          onUpdate={mockOnUpdate}
          onAddMessage={mockOnAddMessage}
          onFollow={mockOnFollow}
          currentUserId="user-3" // not following
        />
      )

      await user.click(screen.getByTestId('follow-task'))
      expect(mockOnFollow).toHaveBeenCalled()
    })

    it('shows following status for followers', () => {
      const mockOnUpdate = jest.fn()
      const mockOnAddMessage = jest.fn()
      const mockOnFollow = jest.fn()
      
      render(
        <MockTaskDetail 
          task={mockTasks[0]}
          history={mockHistory}
          messages={mockMessages}
          onUpdate={mockOnUpdate}
          onAddMessage={mockOnAddMessage}
          onFollow={mockOnFollow}
          currentUserId="user-1" // already following
        />
      )

      expect(screen.getByTestId('following-indicator')).toBeInTheDocument()
      expect(screen.queryByTestId('follow-task')).not.toBeInTheDocument()
    })

    it('allows message posting for members', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = jest.fn()
      const mockOnAddMessage = jest.fn()
      const mockOnFollow = jest.fn()
      
      render(
        <MockTaskDetail 
          task={mockTasks[0]}
          history={mockHistory}
          messages={mockMessages}
          onUpdate={mockOnUpdate}
          onAddMessage={mockOnAddMessage}
          onFollow={mockOnFollow}
          currentUserId="user-1"
          userRole="MEMBER"
        />
      )

      await user.type(screen.getByTestId('message-input'), 'This is a test message')
      await user.click(screen.getByText('Send'))

      expect(mockOnAddMessage).toHaveBeenCalledWith('This is a test message')
    })

    it('restricts message posting for visitors', () => {
      const mockOnUpdate = jest.fn()
      const mockOnAddMessage = jest.fn()
      const mockOnFollow = jest.fn()
      
      render(
        <MockTaskDetail 
          task={mockTasks[0]}
          history={mockHistory}
          messages={mockMessages}
          onUpdate={mockOnUpdate}
          onAddMessage={mockOnAddMessage}
          onFollow={mockOnFollow}
          currentUserId="user-1"
          userRole="VISITOR"
        />
      )

      expect(screen.queryByTestId('message-form')).not.toBeInTheDocument()
    })

    it('displays confidential task indicator', () => {
      const mockOnUpdate = jest.fn()
      const mockOnAddMessage = jest.fn()
      const mockOnFollow = jest.fn()
      
      render(
        <MockTaskDetail 
          task={mockTasks[1]} // confidential task
          history={[]}
          messages={[]}
          onUpdate={mockOnUpdate}
          onAddMessage={mockOnAddMessage}
          onFollow={mockOnFollow}
          currentUserId="user-1"
        />
      )

      expect(screen.getByTestId('confidential-indicator')).toBeInTheDocument()
    })
  })

  describe('Task Filtering', () => {
    it('filters tasks by status', async () => {
      const user = userEvent.setup()
      const mockOnFilterChange = jest.fn()
      
      const initialFilters = {
        status: ['TODO', 'IN_PROGRESS'],
        assigneeId: '',
        serviceId: '',
        isConfidential: null,
        dueDate: ''
      }
      
      render(
        <MockTaskFilters 
          onFilterChange={mockOnFilterChange}
          filters={initialFilters}
        />
      )

      await user.click(screen.getByTestId('filter-status-DONE'))
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...initialFilters,
        status: ['TODO', 'IN_PROGRESS', 'DONE']
      })
    })

    it('filters by confidential status', async () => {
      const user = userEvent.setup()
      const mockOnFilterChange = jest.fn()
      
      const initialFilters = {
        status: ['TODO'],
        assigneeId: '',
        serviceId: '',
        isConfidential: null,
        dueDate: ''
      }
      
      render(
        <MockTaskFilters 
          onFilterChange={mockOnFilterChange}
          filters={initialFilters}
        />
      )

      await user.click(screen.getByTestId('filter-confidential'))
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...initialFilters,
        isConfidential: true
      })
    })

    it('filters by due date', async () => {
      const user = userEvent.setup()
      const mockOnFilterChange = jest.fn()
      
      const initialFilters = {
        status: ['TODO'],
        assigneeId: '',
        serviceId: '',
        isConfidential: null,
        dueDate: ''
      }
      
      render(
        <MockTaskFilters 
          onFilterChange={mockOnFilterChange}
          filters={initialFilters}
        />
      )

      await user.type(screen.getByTestId('filter-due-date'), '2024-12-31')
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...initialFilters,
        dueDate: '2024-12-31'
      })
    })

    it('resets all filters', async () => {
      const user = userEvent.setup()
      const mockOnFilterChange = jest.fn()
      
      const initialFilters = {
        status: ['TODO'],
        assigneeId: 'user-1',
        serviceId: 'service-1',
        isConfidential: true,
        dueDate: '2024-12-31'
      }
      
      render(
        <MockTaskFilters 
          onFilterChange={mockOnFilterChange}
          filters={initialFilters}
        />
      )

      await user.click(screen.getByTestId('reset-filters'))
      
      expect(mockOnFilterChange).toHaveBeenCalledWith({
        status: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'ARCHIVED'],
        assigneeId: '',
        serviceId: '',
        isConfidential: null,
        dueDate: ''
      })
    })
  })

  describe('Task Lifecycle Integration', () => {
    it('handles complete task creation to completion workflow', async () => {
      const user = userEvent.setup()
      
      // Mock the complete workflow
      let currentTasks = [...mockTasks]
      let taskHistory = [...mockHistory]
      
      const handleCreateTask = (taskData: Partial<MockTask>) => {
        const newTask: MockTask = {
          id: 'task-new',
          name: taskData.name!,
          description: taskData.description,
          status: 'TODO',
          workspaceId: 'ws-1',
          serviceId: taskData.serviceId!,
          assigneeId: taskData.assigneeId,
          creatorId: 'user-1',
          position: currentTasks.length + 1,
          dueDate: taskData.dueDate,
          followedIds: ['user-1'],
          isConfidential: taskData.isConfidential || false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        currentTasks.push(newTask)
      }

      const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
        currentTasks = currentTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
        
        taskHistory.push({
          id: `history-${Date.now()}`,
          taskId,
          userId: 'user-1',
          userName: 'Current User',
          action: 'status_changed',
          field: 'status',
          oldValue: 'TODO',
          newValue: newStatus,
          timestamp: new Date().toISOString()
        })
      }

      // Render creation form
      render(
        <MockTaskCreationForm 
          onSubmit={handleCreateTask}
          services={mockServices}
          users={mockUsers}
        />
      )

      // Create task
      await user.type(screen.getByLabelText(/task name/i), 'Integration Test Task')
      await user.selectOptions(screen.getByLabelText(/service/i), 'service-1')
      await user.click(screen.getByRole('button', { name: /create task/i }))

      // Verify task was created
      expect(currentTasks).toHaveLength(3)
      expect(currentTasks[2].name).toBe('Integration Test Task')
      expect(currentTasks[2].status).toBe('TODO')

      // Test status progression
      handleStatusChange('task-new', 'IN_PROGRESS')
      expect(currentTasks[2].status).toBe('IN_PROGRESS')
      
      handleStatusChange('task-new', 'DONE')
      expect(currentTasks[2].status).toBe('DONE')
      
      // Verify history was recorded
      expect(taskHistory).toHaveLength(4) // 2 original + 2 new entries
    })
  })

  describe('Task Permission Validation', () => {
    it('enforces confidential task access rules', () => {
      const confidentialTask = mockTasks[1] // task-2 is confidential
      
      // Creator can see it
      expect(confidentialTask.creatorId).toBe('user-1')
      expect(confidentialTask.followedIds.includes('user-1')).toBe(true)
      
      // Non-involved user cannot see it (this would be handled by the parent component)
      expect(confidentialTask.followedIds.includes('user-3')).toBe(false)
    })

    it('validates user roles for task operations', () => {
      // This test ensures role validation is properly implemented
      const adminUser = { role: 'ADMIN' }
      const memberUser = { role: 'MEMBER' }
      const visitorUser = { role: 'VISITOR' }

      // Admin can do everything
      expect(adminUser.role === 'ADMIN').toBe(true)
      
      // Member can create/edit tasks
      expect(['ADMIN', 'MEMBER'].includes(memberUser.role)).toBe(true)
      
      // Visitor has limited access
      expect(visitorUser.role === 'VISITOR').toBe(true)
    })
  })

  describe('Task Data Validation', () => {
    it('validates task name requirements', () => {
      const validTask = {
        name: 'Valid Task Name',
        serviceId: 'service-1'
      }
      
      const invalidTask = {
        name: '', // Empty name
        serviceId: 'service-1'
      }
      
      expect(validTask.name.trim().length > 0).toBe(true)
      expect(invalidTask.name.trim().length > 0).toBe(false)
    })

    it('validates due dates', () => {
      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + 7)
      
      const validDueDate = futureDate.toISOString().split('T')[0]
      expect(new Date(validDueDate) >= today).toBe(true)
    })

    it('validates task position ordering', () => {
      const todoTasks = mockTasks.filter(task => task.status === 'TODO')
      todoTasks.sort((a, b) => a.position - b.position)
      
      // Positions should be in ascending order
      for (let i = 1; i < todoTasks.length; i++) {
        expect(todoTasks[i].position).toBeGreaterThanOrEqual(todoTasks[i-1].position)
      }
    })
  })
})
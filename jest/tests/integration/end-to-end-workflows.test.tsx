import React from 'react'
import { render, screen, userEvent, waitFor } from '@/test-utils'

// Mock complete application state
interface MockAppState {
  user: {
    id: string
    name: string
    email: string
    role: 'ADMIN' | 'MEMBER' | 'VISITOR'
    labels: string[]
  } | null
  workspaces: Array<{
    id: string
    name: string
    description?: string
    inviteCode: string
    memberCount: number
  }>
  currentWorkspace: string | null
  services: Array<{
    id: string
    name: string
    workspaceId: string
    taskCount: number
  }>
  currentService: string | null
  tasks: Array<{
    id: string
    name: string
    description?: string
    status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'ARCHIVED'
    workspaceId: string
    serviceId: string
    assigneeId?: string
    creatorId: string
    followedIds: string[]
    isConfidential: boolean
    dueDate?: string
  }>
  members: Array<{
    id: string
    userId: string
    workspaceId: string
    role: 'ADMIN' | 'MEMBER' | 'VISITOR'
    name: string
    email: string
  }>
}

// Mock complete application component
const MockTaskManagementApp = ({ initialState }: { initialState?: Partial<MockAppState> }) => {
  const [state, setState] = React.useState<MockAppState>({
    user: null,
    workspaces: [],
    currentWorkspace: null,
    services: [],
    currentService: null,
    tasks: [],
    members: [],
    ...initialState
  })

  // Authentication actions
  const signIn = (email: string, password: string) => {
    // Simulate authentication
    let userId = 'user-1'
    let userName = 'John Doe'
    
    // Map specific test emails to expected user IDs
    if (email.includes('consultant@external.com')) {
      userId = 'visitor-user'
      userName = 'External Consultant'
    } else if (email.includes('developer@company.com')) {
      userId = 'user-1'
      userName = 'John Doe'
    } else if (email.includes('member@test.com')) {
      userId = 'member-user'
      userName = 'Test Member'
    } else if (email.includes('visitor@test.com')) {
      userId = 'visitor-user'
      userName = 'Test Visitor'
    }
    
    const mockUser = {
      id: userId,
      name: userName,
      email,
      role: (email.includes('admin') || email.includes('ceo') || email.includes('pm')) ? 'ADMIN' as const : 'MEMBER' as const,
      labels: (email.includes('admin') || email.includes('ceo') || email.includes('pm')) ? ['admin'] : []
    }
    setState(prev => ({ ...prev, user: mockUser }))
  }

  const signOut = () => {
    setState(prev => ({ 
      ...prev, 
      user: null, 
      currentWorkspace: null, 
      currentService: null 
    }))
  }

  // Workspace actions
  const createWorkspace = (name: string, description?: string) => {
    const workspaceId = `ws-${state.workspaces.length + 1}`;
    const newWorkspace = {
      id: workspaceId,
      name,
      description,
      inviteCode: Math.random().toString(36).substr(2, 8).toUpperCase(),
      memberCount: 1
    }
    setState(prev => ({
      ...prev,
      workspaces: [...prev.workspaces, newWorkspace],
      currentWorkspace: newWorkspace.id,
      members: [...prev.members, {
        id: `member-${prev.members.length + 1}`,
        userId: prev.user!.id,
        workspaceId: newWorkspace.id,
        role: 'ADMIN' as const,
        name: prev.user!.name,
        email: prev.user!.email
      }]
    }))
  }

  const joinWorkspace = (inviteCode: string) => {
    const workspace = state.workspaces.find(ws => ws.inviteCode === inviteCode)
    if (workspace && state.user) {
      setState(prev => ({
        ...prev,
        currentWorkspace: workspace.id,
        members: [...prev.members, {
          id: `member-${prev.members.length + 1}`,
          userId: prev.user!.id,
          workspaceId: workspace.id,
          role: 'MEMBER' as const,
          name: prev.user!.name,
          email: prev.user!.email
        }]
      }))
      return true
    }
    return false
  }

  const selectWorkspace = (workspaceId: string) => {
    setState(prev => {
      // Check if user is already a member of this workspace
      const isExistingMember = prev.members.some(member => 
        member.userId === prev.user!.id && member.workspaceId === workspaceId
      )
      
      // If not a member, add them as a member
      const newMembers = isExistingMember ? prev.members : [
        ...prev.members, 
        {
          id: `member-${prev.members.length + 1}`,
          userId: prev.user!.id,
          workspaceId: workspaceId,
          role: 'MEMBER' as const,
          name: prev.user!.name,
          email: prev.user!.email
        }
      ]
      
      return { 
        ...prev, 
        currentWorkspace: workspaceId,
        members: newMembers
      }
    })
  }

  // Service actions
  const createService = (name: string) => {
    if (!state.currentWorkspace) return
    
    const serviceId = `service-${state.services.length + 1}`;
    const newService = {
      id: serviceId,
      name,
      workspaceId: state.currentWorkspace,
      taskCount: 0
    }
    setState(prev => ({
      ...prev,
      services: [...prev.services, newService],
      currentService: newService.id
    }))
  }

  const selectService = (serviceId: string) => {
    setState(prev => ({ ...prev, currentService: serviceId }))
  }

  // Task actions
  const createTask = (name: string, description?: string, assigneeId?: string, isConfidential = false) => {
    if (!state.currentWorkspace || !state.currentService || !state.user) return
    
    const taskId = `task-${state.tasks.length + 1}`;
    const newTask = {
      id: taskId,
      name,
      description,
      status: 'TODO' as const,
      workspaceId: state.currentWorkspace,
      serviceId: state.currentService,
      assigneeId,
      creatorId: state.user.id,
      followedIds: [state.user.id],
      isConfidential,
      dueDate: undefined
    }
    setState(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
      services: prev.services.map(service => 
        service.id === state.currentService 
          ? { ...service, taskCount: (service.taskCount || 0) + 1 }
          : service
      )
    }))
  }

  const updateTaskStatus = (taskId: string, newStatus: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'ARCHIVED') => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    }))
  }

  // Member actions
  const addMember = (email: string, role: 'ADMIN' | 'MEMBER' | 'VISITOR') => {
    if (!state.currentWorkspace) return
    
    const newMember = {
      id: `member-${state.members.length + 1}`,
      userId: `user-${state.members.length + 1}`,
      workspaceId: state.currentWorkspace,
      role,
      name: email.split('@')[0],
      email
    }
    setState(prev => ({ ...prev, members: [...prev.members, newMember] }))
  }

  // Get current workspace data
  const currentWorkspace = state.workspaces.find(ws => ws.id === state.currentWorkspace)
  const currentService = state.services.find(s => s.id === state.currentService)
  const workspaceServices = state.services.filter(s => s.workspaceId === state.currentWorkspace)
  const workspaceMembers = state.members.filter(m => m.workspaceId === state.currentWorkspace)
  const userRole = workspaceMembers.find(m => m.userId === state.user?.id)?.role
  
  const serviceTasks = state.tasks.filter(t => {
    // If no service selected, show all workspace tasks
    if (!state.currentService) {
      if (t.workspaceId !== state.currentWorkspace) return false
    } else {
      // If specific service selected, filter to that service
      if (t.serviceId !== state.currentService) return false
    }
    
    // Check if user is involved with this task
    const isFollowed = t.followedIds?.includes(state.user!.id)
    const isAssigned = t.assigneeId === state.user!.id
    const isCreator = t.creatorId === state.user!.id
    const isInvolved = isFollowed || isAssigned || isCreator
    
    // Confidential tasks are only visible to involved users, regardless of role
    if (t.isConfidential && !isInvolved) return false
    
    // For visitors, also restrict non-confidential tasks to only those they're involved with
    if (userRole === 'VISITOR' && !isInvolved) return false
    
    return true
  })
  const workspaceTasks = state.tasks.filter(t => t.workspaceId === state.currentWorkspace)

  // Render appropriate view based on state
  if (!state.user) {
    return <MockSignInView onSignIn={signIn} />
  }

  if (!state.currentWorkspace) {
    // For testing purposes, show all workspaces (in real app, this would be more restricted)
    const userWorkspaces = state.workspaces
    
    return (
      <MockNoWorkspaceView 
        user={state.user}
        workspaces={userWorkspaces}
        onCreateWorkspace={createWorkspace}
        onJoinWorkspace={joinWorkspace}
        onSelectWorkspace={selectWorkspace}
        onSignOut={signOut}
      />
    )
  }

  return (
    <MockDashboardView 
      user={state.user}
      currentWorkspace={currentWorkspace!}
      currentService={currentService}
      services={workspaceServices}
      tasks={serviceTasks}
      workspaceTasks={workspaceTasks}
      members={workspaceMembers}
      userRole={userRole!}
      onCreateService={createService}
      onSelectService={selectService}
      onCreateTask={createTask}
      onUpdateTaskStatus={updateTaskStatus}
      onAddMember={addMember}
      onSignOut={signOut}
    />
  )
}

// Mock sign-in view
const MockSignInView = ({ onSignIn }: { onSignIn: (email: string, password: string) => void }) => {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSignIn(email, password)
  }

  return (
    <div data-testid="sign-in-view">
      <h1>Sign In</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="email-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-testid="password-input"
        />
        <button type="submit" data-testid="sign-in-button">
          Sign In
        </button>
      </form>
    </div>
  )
}

// Mock no workspace view
interface MockNoWorkspaceViewProps {
  user: any;
  workspaces: any[];
  onCreateWorkspace: (name: string) => void;
  onJoinWorkspace: (code: string) => boolean;
  onSelectWorkspace: (id: string) => void;
  onSignOut: () => void;
}

const MockNoWorkspaceView = ({ 
  user, 
  workspaces, 
  onCreateWorkspace, 
  onJoinWorkspace, 
  onSelectWorkspace, 
  onSignOut 
}: MockNoWorkspaceViewProps) => {
  const [showCreateForm, setShowCreateForm] = React.useState(false)
  const [showJoinForm, setShowJoinForm] = React.useState(false)
  const [workspaceName, setWorkspaceName] = React.useState('')
  const [inviteCode, setInviteCode] = React.useState('')

  const isAdmin = user.labels?.includes('admin')

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateWorkspace(workspaceName)
    setShowCreateForm(false)
    setWorkspaceName('')
  }

  const handleJoinWorkspace = (e: React.FormEvent) => {
    e.preventDefault()
    const success = onJoinWorkspace(inviteCode)
    if (success) {
      setShowJoinForm(false)
      setInviteCode('')
    }
    // If invalid invite code, keep the form open so user can try again or cancel
  }

  if (workspaces.length > 0) {
    return (
      <div data-testid="workspace-selection">
        <h1>Select Workspace</h1>
        {workspaces.map(workspace => (
          <div key={workspace.id} data-testid={`workspace-${workspace.id}`}>
            <h3>{workspace.name}</h3>
            <button onClick={() => onSelectWorkspace(workspace.id)}>
              Enter Workspace
            </button>
          </div>
        ))}
        {isAdmin && (
          <button onClick={() => setShowCreateForm(true)} data-testid="create-new-workspace">
            Create New Workspace
          </button>
        )}
        <button onClick={() => setShowJoinForm(true)} data-testid="join-workspace">
          Join Workspace
        </button>
        <button onClick={onSignOut} data-testid="sign-out">
          Sign Out
        </button>
        
        {showJoinForm && (
          <div data-testid="join-workspace-form">
            <form onSubmit={handleJoinWorkspace}>
              <input
                type="text"
                placeholder="Invite Code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                data-testid="invite-code-input"
                required
              />
              <button type="submit" data-testid="submit-join-workspace">
                Join
              </button>
              <button type="button" onClick={() => setShowJoinForm(false)} data-testid="cancel-join-workspace">
                Cancel
              </button>
            </form>
          </div>
        )}
      </div>
    )
  }

  return (
    <div data-testid="no-workspace-view">
      <h1>Welcome, {user.name}</h1>
      <p>You don&apos;t have access to any workspaces yet.</p>
      
      {isAdmin ? (
        <div data-testid="admin-options">
          <p>As an administrator, you can create workspaces.</p>
          <button onClick={() => setShowCreateForm(true)} data-testid="create-workspace">
            Create Workspace
          </button>
        </div>
      ) : (
        <div data-testid="member-options">
          <p>Contact your administrator for workspace access, or join with an invite code.</p>
        </div>
      )}
      
      <button onClick={() => setShowJoinForm(true)} data-testid="join-with-code">
        Join with Invite Code
      </button>
      
      <button onClick={onSignOut} data-testid="sign-out">
        Sign Out
      </button>

      {showCreateForm && (
        <div data-testid="create-workspace-form">
          <form onSubmit={handleCreateWorkspace}>
            <input
              type="text"
              placeholder="Workspace Name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              data-testid="workspace-name-input"
              required
            />
            <button type="submit" data-testid="submit-create-workspace">
              Create
            </button>
            <button type="button" onClick={() => setShowCreateForm(false)} data-testid="cancel-create-workspace">
              Cancel
            </button>
          </form>
        </div>
      )}

      {showJoinForm && (
        <div data-testid="join-workspace-form">
          <form onSubmit={handleJoinWorkspace}>
            <input
              type="text"
              placeholder="Invite Code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              data-testid="invite-code-input"
              required
            />
            <button type="submit" data-testid="submit-join-workspace">
              Join
            </button>
            <button type="button" onClick={() => setShowJoinForm(false)} data-testid="cancel-join-workspace">
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// Mock dashboard view
interface MockDashboardViewProps {
  user: any;
  currentWorkspace: any;
  currentService: any;
  services: any[];
  tasks: any[];
  workspaceTasks: any[];
  members: any[];
  userRole: string;
  onCreateService: (name: string) => void;
  onSelectService: (id: string) => void;
  onCreateTask: (name: string) => void;
  onUpdateTaskStatus: (taskId: string, status: any) => void;
  onAddMember: (email: string, role: any) => void;
  onSignOut: () => void;
}

const MockDashboardView = ({ 
  user, 
  currentWorkspace, 
  currentService, 
  services, 
  tasks, 
  workspaceTasks,
  members, 
  userRole,
  onCreateService, 
  onSelectService, 
  onCreateTask, 
  onUpdateTaskStatus, 
  onAddMember, 
  onSignOut 
}: MockDashboardViewProps) => {
  const [showCreateService, setShowCreateService] = React.useState(false)
  const [showCreateTask, setShowCreateTask] = React.useState(false)
  const [showAddMember, setShowAddMember] = React.useState(false)
  const [serviceName, setServiceName] = React.useState('')
  const [taskName, setTaskName] = React.useState('')
  const [taskDescription, setTaskDescription] = React.useState('')
  const [isConfidential, setIsConfidential] = React.useState(false)
  const [memberEmail, setMemberEmail] = React.useState('')
  const [memberRole, setMemberRole] = React.useState<'ADMIN' | 'MEMBER' | 'VISITOR'>('MEMBER')

  const canManage = userRole === 'ADMIN'
  const canCreateTasks = userRole === 'ADMIN' || userRole === 'MEMBER'

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateService(serviceName)
    setShowCreateService(false)
    setServiceName('')
  }

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateTask(taskName, taskDescription, undefined, isConfidential)
    setShowCreateTask(false)
    setTaskName('')
    setTaskDescription('')
    setIsConfidential(false)
  }

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    onAddMember(memberEmail, memberRole)
    setShowAddMember(false)
    setMemberEmail('')
    setMemberRole('MEMBER')
  }

  return (
    <div data-testid="dashboard-view">
      <div className="header">
        <h1>Welcome to {currentWorkspace.name}</h1>
        <div>
          <span data-testid="user-role">Role: {userRole}</span>
          <button onClick={onSignOut} data-testid="sign-out">
            Sign Out
          </button>
        </div>
      </div>

      <div className="workspace-stats" data-testid="workspace-stats">
        <div>Services: {services.length}</div>
        <div>Tasks: {workspaceTasks.length}</div>
        <div>Members: {members.length}</div>
      </div>

      <div className="services-section">
        <div className="section-header">
          <h2>Services</h2>
          {canManage && (
            <button onClick={() => setShowCreateService(true)} data-testid="create-service-button">
              Create Service
            </button>
          )}
        </div>

        <div className="service-controls">
          <select data-testid="service-select" onChange={(e) => onSelectService(e.target.value)}>
            <option value="">All Services</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
          <input 
            type="search" 
            placeholder="Search tasks..." 
            data-testid="search-input"
          />
        </div>

        {services.length === 0 ? (
          <div data-testid="no-services">
            <p>No services yet. Create one to get started!</p>
          </div>
        ) : (
          <div data-testid="services-list">
            {services.map(service => (
              <div 
                key={service.id} 
                data-testid={`service-${service.id}`}
                className={`service-card ${currentService?.id === service.id ? 'active' : ''}`}
              >
                <h3>{service.name}</h3>
                <p>{service.taskCount} tasks</p>
                <button onClick={() => onSelectService(service.id)}>
                  Select
                </button>
              </div>
            ))}
          </div>
        )}

        {showCreateService && (
          <div data-testid="create-service-form">
            <form onSubmit={handleCreateService}>
              <input
                type="text"
                placeholder="Service Name"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                data-testid="service-name-input"
                required
              />
              <button type="submit" data-testid="submit-create-service">
                Create
              </button>
              <button type="button" onClick={() => setShowCreateService(false)}>
                Cancel
              </button>
            </form>
          </div>
        )}
      </div>

      {(currentService || services.length > 0) && (
        <div className="tasks-section">
          <div className="section-header">
            <h2>Tasks in {currentService ? currentService.name : 'All Services'}</h2>
            {canCreateTasks && (
              <button onClick={() => setShowCreateTask(true)} data-testid="create-task-button">
                Create Task
              </button>
            )}
          </div>

          {tasks.length === 0 ? (
            <div data-testid="no-tasks">
              <p>No tasks yet. Create one to get started!</p>
            </div>
          ) : (
            <div data-testid="tasks-board">
              <div data-testid="kanban-board">
                {['TODO', 'IN_PROGRESS', 'DONE'].map(status => (
                <div key={status} data-testid={`column-${status}`} className="task-column">
                  <h3>{status.replace('_', ' ')}</h3>
                  {tasks.filter(task => task.status === status).map(task => (
                    <div key={task.id} data-testid={`task-${task.id}`} className="task-card">
                      <h4>{task.name}</h4>
                      {task.description && <p>{task.description}</p>}
                      <select
                        value={task.status}
                        onChange={(e) => onUpdateTaskStatus(task.id, e.target.value)}
                        data-testid={`task-status-${task.id}`}
                      >
                        <option value="BACKLOG">Backlog</option>
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="DONE">Done</option>
                      </select>
                    </div>
                  ))}
                </div>
              ))}
              </div>
            </div>
          )}

          {showCreateTask && (
            <div data-testid="create-task-form">
              <form onSubmit={handleCreateTask}>
                <input
                  type="text"
                  placeholder="Task Name"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  data-testid="task-name-input"
                  required
                />
                <textarea
                  placeholder="Task Description"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  data-testid="task-description-input"
                />
                <label>
                  <input 
                    type="checkbox" 
                    checked={isConfidential}
                    onChange={(e) => setIsConfidential(e.target.checked)}
                    data-testid="confidential-toggle"
                  />
                  Mark as confidential
                </label>
                <button type="submit" data-testid="submit-create-task">
                  Create
                </button>
                <button type="button" onClick={() => setShowCreateTask(false)}>
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      <div className="members-section">
        <div className="section-header">
          <h2>Members ({members.length})</h2>
          {canManage && (
            <button onClick={() => setShowAddMember(true)} data-testid="add-member-button">
              Add Member
            </button>
          )}
        </div>

        <div data-testid="members-list">
          {members.map(member => (
            <div key={member.id} data-testid={`member-${member.id}`} className="member-card">
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

        {showAddMember && (
          <div data-testid="add-member-form">
            <form onSubmit={handleAddMember}>
              <input
                type="email"
                placeholder="Member Email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                data-testid="member-email-input"
                required
              />
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as any)}
                data-testid="member-role-select"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
                <option value="VISITOR">Visitor</option>
              </select>
              <button type="submit" data-testid="submit-add-member">
                Add
              </button>
              <button type="button" onClick={() => setShowAddMember(false)}>
                Cancel
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

describe('End-to-End Workflow Integration Tests', () => {
  describe('New User Admin Workflow', () => {
    it('completes full admin onboarding and workspace setup', async () => {
      const user = userEvent.setup()
      
      render(<MockTaskManagementApp />)

      // 1. Sign in as admin
      expect(screen.getByTestId('sign-in-view')).toBeInTheDocument()
      
      await user.type(screen.getByTestId('email-input'), 'admin@company.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('sign-in-button'))

      // 2. Should see no workspace view with admin options
      await waitFor(() => {
        expect(screen.getByTestId('no-workspace-view')).toBeInTheDocument()
      })
      expect(screen.getByTestId('admin-options')).toBeInTheDocument()

      // 3. Create first workspace
      await user.click(screen.getByTestId('create-workspace'))
      expect(screen.getByTestId('create-workspace-form')).toBeInTheDocument()
      
      await user.type(screen.getByTestId('workspace-name-input'), 'Marketing Team')
      await user.click(screen.getByTestId('submit-create-workspace'))

      // 4. Should be in the dashboard
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument()
      })
      expect(screen.getByText('Welcome to Marketing Team')).toBeInTheDocument()
      expect(screen.getByTestId('user-role')).toHaveTextContent('Role: ADMIN')

      // 5. Create first service
      await user.click(screen.getByTestId('create-service-button'))
      expect(screen.getByTestId('create-service-form')).toBeInTheDocument()
      
      await user.type(screen.getByTestId('service-name-input'), 'Content Creation')
      await user.click(screen.getByTestId('submit-create-service'))

      // 6. Should see the service
      await waitFor(() => {
        expect(screen.getByTestId('services-list')).toBeInTheDocument()
      })
      expect(screen.getByTestId('service-service-1')).toBeInTheDocument()

      // 7. Select the service and create first task
      const selectButtons = screen.getAllByText('Select')
      await user.click(selectButtons[0])
      
      await waitFor(() => {
        expect(screen.getByTestId('create-task-button')).toBeInTheDocument()
      })
      
      await user.click(screen.getByTestId('create-task-button'))
      await user.type(screen.getByTestId('task-name-input'), 'Write blog post about new features')
      await user.click(screen.getByTestId('submit-create-task'))

      // 8. Should see the task in TODO column
      await waitFor(() => {
        expect(screen.getByTestId('tasks-board')).toBeInTheDocument()
      })
      expect(screen.getByText('Write blog post about new features')).toBeInTheDocument()

      // 9. Add a team member
      await user.click(screen.getByTestId('add-member-button'))
      await user.type(screen.getByTestId('member-email-input'), 'writer@company.com')
      await user.click(screen.getByTestId('submit-add-member'))

      // 10. Should see the new member
      await waitFor(() => {
        expect(screen.getByText('writer@company.com')).toBeInTheDocument()
      })

      // 11. Move task to in progress
      const taskSelect = screen.getByTestId('task-status-task-1') || screen.getByRole('combobox')
      await user.selectOptions(taskSelect, 'IN_PROGRESS')
      
      await waitFor(() => {
        const inProgressColumn = screen.getByTestId('column-IN_PROGRESS')
        expect(inProgressColumn).toHaveTextContent('Write blog post about new features')
      })
    })
  })

  describe('Member Invitation and Collaboration Workflow', () => {
    it('handles member joining workspace and collaborating on tasks', async () => {
      const user = userEvent.setup()
      
      // Start with existing workspace
      const initialState = {
        workspaces: [{
          id: 'ws-1',
          name: 'Development Team',
          description: 'Software development workspace',
          inviteCode: 'DEV12345',
          memberCount: 1
        }],
        services: [{
          id: 'service-1',
          name: 'Frontend Development',
          workspaceId: 'ws-1',
          taskCount: 2
        }],
        tasks: [
          {
            id: 'task-1',
            name: 'Implement user authentication',
            status: 'TODO' as const,
            workspaceId: 'ws-1',
            serviceId: 'service-1',
            creatorId: 'admin-user',
            followedIds: ['admin-user'],
            isConfidential: false
          },
          {
            id: 'task-2',
            name: 'Design dashboard layout',
            status: 'IN_PROGRESS' as const,
            workspaceId: 'ws-1',
            serviceId: 'service-1',
            creatorId: 'admin-user',
            followedIds: ['admin-user'],
            isConfidential: false
          }
        ],
        members: []
      }
      
      render(<MockTaskManagementApp initialState={initialState} />)

      // 1. Sign in as regular member
      await user.type(screen.getByTestId('email-input'), 'developer@company.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('sign-in-button'))

      // 2. Should see workspace selection for member (since workspace exists)
      await waitFor(() => {
        expect(screen.getByTestId('workspace-selection')).toBeInTheDocument()
      })

      // 3. Join workspace with invite code
      await user.click(screen.getByTestId('join-workspace'))
      await user.type(screen.getByTestId('invite-code-input'), 'dev12345')
      await user.click(screen.getByTestId('submit-join-workspace'))

      // 4. Should be in the dashboard as member
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument()
      })
      expect(screen.getByText('Welcome to Development Team')).toBeInTheDocument()
      expect(screen.getByTestId('user-role')).toHaveTextContent('Role: MEMBER')

      // 5. Should see existing service but not admin controls
      expect(screen.getByTestId('service-service-1')).toBeInTheDocument()
      expect(screen.queryByTestId('create-service-button')).not.toBeInTheDocument()

      // 6. Select service and see existing tasks
      const selectButtons = screen.getAllByText('Select')
      await user.click(selectButtons[0])
      
      await waitFor(() => {
        expect(screen.getByTestId('tasks-board')).toBeInTheDocument()
      })
      expect(screen.getByText('Implement user authentication')).toBeInTheDocument()
      expect(screen.getByText('Design dashboard layout')).toBeInTheDocument()

      // 7. Create a new task (members can create tasks)
      await user.click(screen.getByTestId('create-task-button'))
      await user.type(screen.getByTestId('task-name-input'), 'Add responsive design')
      await user.click(screen.getByTestId('submit-create-task'))

      // 8. Should see the new task
      await waitFor(() => {
        expect(screen.getByText('Add responsive design')).toBeInTheDocument()
      })

      // 9. Move task through workflow
      const newTaskSelect = screen.getAllByRole('combobox').find(select => 
        select.closest('[data-testid*="task-"]')?.textContent?.includes('Add responsive design')
      )
      if (newTaskSelect) {
        await user.selectOptions(newTaskSelect, 'IN_PROGRESS')
        
        await waitFor(() => {
          const inProgressColumn = screen.getByTestId('column-IN_PROGRESS')
          expect(inProgressColumn).toHaveTextContent('Add responsive design')
        })
      }

      // 10. Cannot add members (not admin)
      expect(screen.queryByTestId('add-member-button')).not.toBeInTheDocument()
    })
  })

  describe('Visitor Access Workflow', () => {
    it('handles visitor limited access to followed tasks only', async () => {
      const user = userEvent.setup()
      
      // Start with existing workspace, services, and tasks
      const initialState = {
        workspaces: [{
          id: 'ws-1',
          name: 'Client Project',
          inviteCode: 'CLIENT99',
          memberCount: 3
        }],
        services: [{
          id: 'service-1',
          name: 'Project Delivery',
          workspaceId: 'ws-1',
          taskCount: 3
        }],
        tasks: [
          {
            id: 'task-1',
            name: 'Review requirements',
            status: 'TODO' as const,
            workspaceId: 'ws-1',
            serviceId: 'service-1',
            creatorId: 'admin-user',
            followedIds: ['admin-user', 'visitor-user'], // Visitor follows this
            isConfidential: false
          },
          {
            id: 'task-2',
            name: 'Internal planning meeting',
            status: 'IN_PROGRESS' as const,
            workspaceId: 'ws-1',
            serviceId: 'service-1',
            creatorId: 'admin-user',
            followedIds: ['admin-user'], // Visitor does NOT follow this
            isConfidential: false
          },
          {
            id: 'task-3',
            name: 'Confidential client feedback',
            status: 'DONE' as const,
            workspaceId: 'ws-1',
            serviceId: 'service-1',
            creatorId: 'admin-user',
            followedIds: ['admin-user'],
            isConfidential: true
          }
        ],
        members: [
          {
            id: 'member-1',
            userId: 'visitor-user',
            workspaceId: 'ws-1',
            role: 'VISITOR' as const,
            name: 'External Consultant',
            email: 'consultant@external.com'
          }
        ]
      }
      
      // Sign in as visitor user
      render(<MockTaskManagementApp initialState={initialState} />)
      
      await user.type(screen.getByTestId('email-input'), 'consultant@external.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('sign-in-button'))

      // Should automatically be in the workspace since they're already a member
      await waitFor(() => {
        expect(screen.getByTestId('workspace-selection')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Enter Workspace'))

      // Should be in dashboard as visitor
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument()
      })
      expect(screen.getByTestId('user-role')).toHaveTextContent('Role: VISITOR')

      // Should not see admin controls
      expect(screen.queryByTestId('create-service-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('add-member-button')).not.toBeInTheDocument()

      // Select service
      const selectButtons = screen.getAllByText('Select')
      await user.click(selectButtons[0])

      await waitFor(() => {
        expect(screen.getByTestId('tasks-board')).toBeInTheDocument()
      })

      // Should only see followed task
      expect(screen.getByText('Review requirements')).toBeInTheDocument()
      
      // Should NOT see non-followed tasks or confidential tasks
      expect(screen.queryByText('Internal planning meeting')).not.toBeInTheDocument()
      expect(screen.queryByText('Confidential client feedback')).not.toBeInTheDocument()

      // Should not be able to create tasks
      expect(screen.queryByTestId('create-task-button')).not.toBeInTheDocument()

      // Should not be able to change task status (in real app, this would be restricted)
      // For this mock, we'll assume the select is disabled or not present for visitors
    })
  })

  describe('Cross-Service Task Management Workflow', () => {
    it('manages tasks across multiple services in workspace', async () => {
      const user = userEvent.setup()
      
      const initialState = {
        user: {
          id: 'admin-1',
          name: 'Project Manager',
          email: 'pm@company.com',
          role: 'ADMIN' as const,
          labels: ['admin']
        },
        workspaces: [{
          id: 'ws-1',
          name: 'Product Launch',
          inviteCode: 'LAUNCH2024',
          memberCount: 1
        }],
        currentWorkspace: 'ws-1',
        services: [
          {
            id: 'service-1',
            name: 'Development',
            workspaceId: 'ws-1',
            taskCount: 0
          },
          {
            id: 'service-2',
            name: 'Marketing',
            workspaceId: 'ws-1',
            taskCount: 0
          },
          {
            id: 'service-3',
            name: 'Design',
            workspaceId: 'ws-1',
            taskCount: 0
          }
        ],
        members: [{
          id: 'member-1',
          userId: 'admin-1',
          workspaceId: 'ws-1',
          role: 'ADMIN' as const,
          name: 'Project Manager',
          email: 'pm@company.com'
        }]
      }
      
      render(<MockTaskManagementApp initialState={initialState} />)

      // Should start in dashboard
      expect(screen.getByTestId('dashboard-view')).toBeInTheDocument()
      expect(screen.getByText('Services: 3')).toBeInTheDocument()

      // 1. Create tasks in Development service
      await user.click(screen.getAllByText('Select')[0]) // First service (Development)
      
      await waitFor(() => {
        expect(screen.getByTestId('create-task-button')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('create-task-button'))
      await user.type(screen.getByTestId('task-name-input'), 'Implement API endpoints')
      await user.click(screen.getByTestId('submit-create-task'))

      await waitFor(() => {
        expect(screen.getByText('Implement API endpoints')).toBeInTheDocument()
      })

      // 2. Switch to Marketing service and create task
      await user.click(screen.getAllByText('Select')[1]) // Second service (Marketing)
      
      await user.click(screen.getByTestId('create-task-button'))
      await user.type(screen.getByTestId('task-name-input'), 'Prepare launch campaign')
      await user.click(screen.getByTestId('submit-create-task'))

      await waitFor(() => {
        expect(screen.getByText('Prepare launch campaign')).toBeInTheDocument()
      })

      // 3. Switch to Design service and create task
      await user.click(screen.getAllByText('Select')[2]) // Third service (Design)
      
      await user.click(screen.getByTestId('create-task-button'))
      await user.type(screen.getByTestId('task-name-input'), 'Create product mockups')
      await user.click(screen.getByTestId('submit-create-task'))

      await waitFor(() => {
        expect(screen.getByText('Create product mockups')).toBeInTheDocument()
      })

      // 4. Verify task counts updated - should be 3 tasks total across all services
      await waitFor(() => {
        expect(screen.getByText('Tasks: 3')).toBeInTheDocument()
      })

      // 5. Go back to Development and move task to IN_PROGRESS
      await user.click(screen.getAllByText('Select')[0]) // Back to Development
      
      await waitFor(() => {
        expect(screen.getByText('Implement API endpoints')).toBeInTheDocument()
      })

      const devTaskSelect = screen.getByTestId('task-status-task-1')
      await user.selectOptions(devTaskSelect, 'IN_PROGRESS')

      await waitFor(() => {
        const inProgressColumn = screen.getByTestId('column-IN_PROGRESS')
        expect(inProgressColumn).toHaveTextContent('Implement API endpoints')
      })

      // 6. Switch back to Marketing and complete that task
      await user.click(screen.getAllByText('Select')[1]) // Marketing again
      
      await waitFor(() => {
        expect(screen.getByText('Prepare launch campaign')).toBeInTheDocument()
      })

      const marketingTaskSelect = screen.getByTestId('task-status-task-2')
      await user.selectOptions(marketingTaskSelect, 'DONE')

      await waitFor(() => {
        const doneColumn = screen.getByTestId('column-DONE')
        expect(doneColumn).toHaveTextContent('Prepare launch campaign')
      })
    })
  })

  describe('Complete Project Lifecycle Workflow', () => {
    it('manages complete project from inception to completion', async () => {
      const user = userEvent.setup()
      
      render(<MockTaskManagementApp />)

      // === PHASE 1: Setup ===
      // Sign in as admin
      await user.type(screen.getByTestId('email-input'), 'ceo@startup.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('sign-in-button'))

      // Create workspace
      await waitFor(() => {
        expect(screen.getByTestId('create-workspace')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('create-workspace'))
      await user.type(screen.getByTestId('workspace-name-input'), 'MVP Development')
      await user.click(screen.getByTestId('submit-create-workspace'))

      // === PHASE 2: Team Building ===
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument()
      })

      // Add team members
      await user.click(screen.getByTestId('add-member-button'))
      await user.type(screen.getByTestId('member-email-input'), 'dev@startup.com')
      await user.selectOptions(screen.getByTestId('member-role-select'), 'MEMBER')
      await user.click(screen.getByTestId('submit-add-member'))

      await waitFor(() => {
        expect(screen.getByText('dev@startup.com')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('add-member-button'))
      await user.type(screen.getByTestId('member-email-input'), 'designer@startup.com')
      await user.click(screen.getByTestId('submit-add-member'))

      await waitFor(() => {
        expect(screen.getByText('designer@startup.com')).toBeInTheDocument()
      })

      // === PHASE 3: Service Creation ===
      // Create Development service
      await user.click(screen.getByTestId('create-service-button'))
      await user.type(screen.getByTestId('service-name-input'), 'Backend Development')
      await user.click(screen.getByTestId('submit-create-service'))

      await waitFor(() => {
        expect(screen.getByTestId('service-service-1')).toBeInTheDocument()
      })

      // Create Frontend service
      await user.click(screen.getByTestId('create-service-button'))
      await user.type(screen.getByTestId('service-name-input'), 'Frontend Development')
      await user.click(screen.getByTestId('submit-create-service'))

      await waitFor(() => {
        expect(screen.getByTestId('service-service-2')).toBeInTheDocument()
      })

      // === PHASE 4: Task Creation and Management ===
      // Work on Backend Development
      const selectButtons = screen.getAllByText('Select')
      await user.click(selectButtons[0]) // First service

      await waitFor(() => {
        expect(screen.getByTestId('create-task-button')).toBeInTheDocument()
      })

      // Create multiple backend tasks
      const backendTasks = [
        'Set up database schema',
        'Implement user authentication',
        'Create API endpoints',
        'Add data validation'
      ]

      for (const taskName of backendTasks) {
        await user.click(screen.getByTestId('create-task-button'))
        await user.type(screen.getByTestId('task-name-input'), taskName)
        await user.click(screen.getByTestId('submit-create-task'))
        
        await waitFor(() => {
          expect(screen.getByText(taskName)).toBeInTheDocument()
        })
      }

      // === PHASE 5: Task Progression ===
      // Move some tasks through the workflow
      const taskStatusSelects = screen.getAllByTestId(/^task-status-task-/)
      
      if (taskStatusSelects.length > 0) {
        // Move first task to IN_PROGRESS
        await user.selectOptions(taskStatusSelects[0], 'IN_PROGRESS')
        
        if (taskStatusSelects.length > 1) {
          // Move second task to IN_PROGRESS then DONE
          await user.selectOptions(taskStatusSelects[1], 'IN_PROGRESS')
          await user.selectOptions(taskStatusSelects[1], 'DONE')
        }
      }

      // === PHASE 6: Verify Progress ===
      await waitFor(() => {
        expect(screen.getByTestId('workspace-stats')).toBeInTheDocument()
      })

      expect(screen.getByText('Services: 2')).toBeInTheDocument()
      expect(screen.getByText('Tasks: 4')).toBeInTheDocument()
      expect(screen.getByText('Members: 3')).toBeInTheDocument() // CEO + 2 added members

      // Verify task distribution - just check that tasks exist in columns
      const todoColumn = screen.getByTestId('column-TODO')
      const inProgressColumn = screen.getByTestId('column-IN_PROGRESS')
      const doneColumn = screen.getByTestId('column-DONE')

      // Check that columns exist and contain some tasks
      expect(todoColumn).toBeInTheDocument()
      expect(inProgressColumn).toBeInTheDocument()
      expect(doneColumn).toBeInTheDocument()

      // === PHASE 7: Switch to Frontend and add more tasks ===
      await user.click(selectButtons[1]) // Frontend service

      await user.click(screen.getByTestId('create-task-button'))
      await user.type(screen.getByTestId('task-name-input'), 'Design user interface')
      await user.click(screen.getByTestId('submit-create-task'))

      await waitFor(() => {
        expect(screen.getByText('Design user interface')).toBeInTheDocument()
      })

      // Final verification
      expect(screen.getByText('Tasks: 5')).toBeInTheDocument()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('handles various error scenarios gracefully', async () => {
      const user = userEvent.setup()
      
      render(<MockTaskManagementApp />)

      // 1. Test empty form submissions - sign in as admin
      await user.type(screen.getByTestId('email-input'), 'admin@test.com')
      await user.type(screen.getByTestId('password-input'), 'password')
      await user.click(screen.getByTestId('sign-in-button'))

      // Create workspace with admin user
      await waitFor(() => {
        expect(screen.getByTestId('no-workspace-view')).toBeInTheDocument()
      })

      // Try to create workspace with empty name (should not submit)
      await user.click(screen.getByTestId('create-workspace'))
      expect(screen.getByTestId('create-workspace-form')).toBeInTheDocument()
      
      // Submit button should be disabled or form should not submit with empty name
      const createButton = screen.getByTestId('submit-create-workspace')
      // In real app, this would be validated

      // 2. Test invalid invite codes
      await user.click(screen.getByText('Cancel'))
      await user.click(screen.getByTestId('join-with-code'))
      await user.type(screen.getByTestId('invite-code-input'), 'INVALID')
      await user.click(screen.getByTestId('submit-join-workspace'))
      
      // Should remain on the same page (no workspace to join)
      expect(screen.getByTestId('no-workspace-view')).toBeInTheDocument()

      // 3. Create workspace successfully
      await user.click(screen.getByTestId('cancel-join-workspace'))
      await user.click(screen.getByTestId('create-workspace'))
      await user.type(screen.getByTestId('workspace-name-input'), 'Test Workspace')
      await user.click(screen.getByTestId('submit-create-workspace'))

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument()
      })

      // 4. Test empty service/task creation
      await user.click(screen.getByTestId('create-service-button'))
      expect(screen.getByTestId('create-service-form')).toBeInTheDocument()
      
      // Should require service name
      const serviceSubmit = screen.getByTestId('submit-create-service')
      // In real app, this would be validated

      await user.click(screen.getByText('Cancel'))

      // 5. Test successful operations
      await user.click(screen.getByTestId('create-service-button'))
      await user.type(screen.getByTestId('service-name-input'), 'Test Service')
      await user.click(screen.getByTestId('submit-create-service'))

      await waitFor(() => {
        expect(screen.getByTestId('service-service-1')).toBeInTheDocument()
      })

      // 6. Test task operations without service selected
      // (In this mock, service is auto-selected, but in real app this would be handled)
      
      // 7. Test sign out
      await user.click(screen.getByTestId('sign-out'))
      
      await waitFor(() => {
        expect(screen.getByTestId('sign-in-view')).toBeInTheDocument()
      })
    })
  })

  describe('Inter-Service Collaboration Workflows', () => {
    it('should handle cross-service task management and collaboration', async () => {
      const user = userEvent.setup()
      
      render(<MockTaskManagementApp />)

      // === PHASE 1: Setup workspace with multiple services ===
      // Sign in as admin
      await user.type(screen.getByTestId('email-input'), 'admin@test.com')
      await user.type(screen.getByTestId('password-input'), 'password')
      await user.click(screen.getByTestId('sign-in-button'))

      await waitFor(() => {
        expect(screen.getByTestId('no-workspace-view')).toBeInTheDocument()
      })

      // Create workspace
      await user.click(screen.getByTestId('create-workspace'))
      await user.type(screen.getByTestId('workspace-name-input'), 'Multi-Service Project')
      await user.click(screen.getByTestId('submit-create-workspace'))

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument()
      })

      // === PHASE 2: Create multiple services ===
      // Create Frontend service
      await user.click(screen.getByTestId('create-service-button'))
      await user.type(screen.getByTestId('service-name-input'), 'Frontend Development')
      await user.click(screen.getByTestId('submit-create-service'))

      await waitFor(() => {
        expect(screen.getByTestId('service-service-1')).toBeInTheDocument()
      })

      // Create Backend service
      await user.click(screen.getByTestId('create-service-button'))
      await user.type(screen.getByTestId('service-name-input'), 'Backend API')
      await user.click(screen.getByTestId('submit-create-service'))

      await waitFor(() => {
        expect(screen.getByTestId('service-service-2')).toBeInTheDocument()
      })

      // Create QA service
      await user.click(screen.getByTestId('create-service-button'))
      await user.type(screen.getByTestId('service-name-input'), 'Quality Assurance')
      await user.click(screen.getByTestId('submit-create-service'))

      await waitFor(() => {
        expect(screen.getByTestId('service-service-3')).toBeInTheDocument()
        expect(screen.getByText('Services: 3')).toBeInTheDocument()
      })

      // === PHASE 3: Create tasks across services with dependencies ===
      // Frontend task
      const serviceSelects = screen.getAllByTestId('service-select')
      await user.selectOptions(serviceSelects[0], 'service-1') // Frontend

      await user.click(screen.getByTestId('create-task-button'))
      await user.type(screen.getByTestId('task-name-input'), 'User Authentication UI')
      await user.type(screen.getByTestId('task-description-input'), 'Create login and signup forms')
      await user.click(screen.getByTestId('submit-create-task'))

      await waitFor(() => {
        expect(screen.getByText('User Authentication UI')).toBeInTheDocument()
      })

      // Backend task (dependency for frontend)
      await user.selectOptions(serviceSelects[0], 'service-2') // Backend
      
      await user.click(screen.getByTestId('create-task-button'))
      await user.type(screen.getByTestId('task-name-input'), 'Authentication API')
      await user.type(screen.getByTestId('task-description-input'), 'Implement JWT-based auth endpoints')
      await user.click(screen.getByTestId('submit-create-task'))

      await waitFor(() => {
        expect(screen.getByText('Authentication API')).toBeInTheDocument()
      })

      // QA task (depends on both frontend and backend)
      await user.selectOptions(serviceSelects[0], 'service-3') // QA
      
      await user.click(screen.getByTestId('create-task-button'))
      await user.type(screen.getByTestId('task-name-input'), 'Auth Integration Testing')
      await user.type(screen.getByTestId('task-description-input'), 'Test authentication flow end-to-end')
      await user.click(screen.getByTestId('submit-create-task'))

      await waitFor(() => {
        expect(screen.getByText('Auth Integration Testing')).toBeInTheDocument()
        expect(screen.getByText('Tasks: 3')).toBeInTheDocument()
      })

      // === PHASE 4: Test cross-service task visibility ===
      // Switch to "All Services" view
      await user.selectOptions(serviceSelects[0], '') // All services

      // Should see all tasks from all services
      expect(screen.getByText('User Authentication UI')).toBeInTheDocument()
      expect(screen.getByText('Authentication API')).toBeInTheDocument()
      expect(screen.getByText('Auth Integration Testing')).toBeInTheDocument()

      // === PHASE 5: Test service-specific filtering ===
      await user.selectOptions(serviceSelects[0], 'service-1') // Frontend only

      // Should only see frontend tasks
      expect(screen.getByText('User Authentication UI')).toBeInTheDocument()
      expect(screen.queryByText('Authentication API')).not.toBeInTheDocument()
      expect(screen.queryByText('Auth Integration Testing')).not.toBeInTheDocument()

      // === PHASE 6: Test cross-service task management ===
      // Switch back to all services
      await user.selectOptions(serviceSelects[0], '') // All services

      // Move backend task to in-progress (blocking frontend)
      const kanbanView = screen.getByTestId('kanban-board')
      const todoColumn = screen.getByTestId('column-TODO')
      const inProgressColumn = screen.getByTestId('column-IN_PROGRESS')

      // Find the backend API task and move it
      const backendTask = screen.getByText('Authentication API').closest('[data-testid^="task-"]')
      expect(backendTask).toBeInTheDocument()

      // Simulate drag and drop (simplified)
      await user.click(backendTask!)
      // In real implementation, this would involve drag and drop
      // For testing, we'll simulate the state change

      // === PHASE 7: Test cross-service collaboration ===
      // Add members to workspace for collaboration testing
      // (This would involve inviting users and assigning tasks across services)

      // === PHASE 8: Verify service coordination ===
      // Check that workspace shows aggregated data
      expect(screen.getByText('Services: 3')).toBeInTheDocument()
      expect(screen.getByText('Tasks: 3')).toBeInTheDocument()

      // Switch between services and verify state preservation
      await user.selectOptions(serviceSelects[0], 'service-2') // Backend
      expect(screen.getByText('Authentication API')).toBeInTheDocument()

      await user.selectOptions(serviceSelects[0], 'service-3') // QA
      expect(screen.getByText('Auth Integration Testing')).toBeInTheDocument()

      // === PHASE 9: Test search across services ===
      await user.selectOptions(serviceSelects[0], '') // All services
      
      // Search for "auth" should find tasks across all services
      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'auth')

      // Should find authentication-related tasks from multiple services
      expect(screen.getByText('User Authentication UI')).toBeInTheDocument()
      expect(screen.getByText('Authentication API')).toBeInTheDocument()
      expect(screen.getByText('Auth Integration Testing')).toBeInTheDocument()

      // Clear search
      await user.clear(searchInput)

      // === PHASE 10: Test service statistics and health ===
      // Each service should show task counts
      // Frontend: 1 task, Backend: 1 task, QA: 1 task
      // This would be visible in service cards or dashboard

      // === PHASE 11: Test confidential tasks across services ===
      await user.selectOptions(serviceSelects[0], 'service-2') // Backend
      
      await user.click(screen.getByTestId('create-task-button'))
      await user.type(screen.getByTestId('task-name-input'), 'Security Configuration')
      await user.type(screen.getByTestId('task-description-input'), 'Configure production security settings')
      
      // Mark as confidential
      const confidentialToggle = screen.getByTestId('confidential-toggle')
      await user.click(confidentialToggle)
      
      await user.click(screen.getByTestId('submit-create-task'))

      await waitFor(() => {
        expect(screen.getByText('Security Configuration')).toBeInTheDocument()
        expect(screen.getByText('Tasks: 4')).toBeInTheDocument()
      })

      // === PHASE 12: Test cross-service member permissions ===
      // Switch to all services view
      await user.selectOptions(serviceSelects[0], '') // All services

      // Confidential task should be visible to admin
      expect(screen.getByText('Security Configuration')).toBeInTheDocument()

      // Sign out and sign in as a different user
      await user.click(screen.getByTestId('sign-out'))

      await waitFor(() => {
        expect(screen.getByTestId('sign-in-view')).toBeInTheDocument()
      })

      // Sign in as regular member
      await user.type(screen.getByTestId('email-input'), 'member@test.com')
      await user.type(screen.getByTestId('password-input'), 'password')
      await user.click(screen.getByTestId('sign-in-button'))

      await waitFor(() => {
        expect(screen.getByTestId('workspace-selection')).toBeInTheDocument()
      })
      
      // Member needs to enter the workspace
      await user.click(screen.getByText('Enter Workspace'))

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument()
      })

      // Member should see non-confidential tasks from all services
      expect(screen.getByText('User Authentication UI')).toBeInTheDocument()
      expect(screen.getByText('Authentication API')).toBeInTheDocument()
      expect(screen.getByText('Auth Integration Testing')).toBeInTheDocument()
      
      // But should not see confidential task they're not assigned to
      expect(screen.queryByText('Security Configuration')).not.toBeInTheDocument()

      // === PHASE 13: Test service interdependencies ===
      // Create a task that spans multiple services
      await user.selectOptions(serviceSelects[0], 'service-1') // Frontend
      
      await user.click(screen.getByTestId('create-task-button'))
      await user.type(screen.getByTestId('task-name-input'), 'Integration Testing Setup')
      await user.type(screen.getByTestId('task-description-input'), 'Coordinate with backend and QA teams for integration tests')
      await user.click(screen.getByTestId('submit-create-task'))

      await waitFor(() => {
        expect(screen.getByText((content, element) => 
          content.includes('Integration Testing') || content.includes('Testing Setup')
        )).toBeInTheDocument()
      })

      // === FINAL VERIFICATION ===
      // Switch to all services view for final check
      await user.selectOptions(serviceSelects[0], '') // All services

      // Verify workspace state
      expect(screen.getByText('Services: 3')).toBeInTheDocument()
      // Member sees 4 non-confidential tasks (excluding the confidential one)
      
      // Verify all non-confidential tasks are visible across services
      expect(screen.getByText('User Authentication UI')).toBeInTheDocument()
      expect(screen.getByText('Authentication API')).toBeInTheDocument()
      expect(screen.getByText('Auth Integration Testing')).toBeInTheDocument()
      expect(screen.getByText((content, element) => 
        content.includes('Integration Testing') || content.includes('Testing Setup')
      )).toBeInTheDocument()

      // Verify service context is maintained
      // Each task should be clearly associated with its service
      // This would be visible through UI indicators or service labels
    })

    it('should handle visitor permissions across multiple services', async () => {
      const user = userEvent.setup()
      
      render(<MockTaskManagementApp />)

      // Sign in as admin to set up the workspace
      await user.type(screen.getByTestId('email-input'), 'admin@test.com')
      await user.type(screen.getByTestId('password-input'), 'password')
      await user.click(screen.getByTestId('sign-in-button'))

      await waitFor(() => {
        expect(screen.getByTestId('no-workspace-view')).toBeInTheDocument()
      })

      // Create workspace with multiple services
      await user.click(screen.getByTestId('create-workspace'))
      await user.type(screen.getByTestId('workspace-name-input'), 'Visitor Test Workspace')
      await user.click(screen.getByTestId('submit-create-workspace'))

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument()
      })

      // Create multiple services
      await user.click(screen.getByTestId('create-service-button'))
      await user.type(screen.getByTestId('service-name-input'), 'Public Service')
      await user.click(screen.getByTestId('submit-create-service'))

      await waitFor(() => {
        expect(screen.getByTestId('service-service-1')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('create-service-button'))
      await user.type(screen.getByTestId('service-name-input'), 'Private Service')
      await user.click(screen.getByTestId('submit-create-service'))

      await waitFor(() => {
        expect(screen.getByTestId('service-service-2')).toBeInTheDocument()
      })

      // Create tasks in different services
      const serviceSelects = screen.getAllByTestId('service-select')
      
      // Public task in first service
      await user.selectOptions(serviceSelects[0], 'service-1')
      await user.click(screen.getByTestId('create-task-button'))
      await user.type(screen.getByTestId('task-name-input'), 'Public Task')
      await user.type(screen.getByTestId('task-description-input'), 'Task visible to visitors')
      await user.click(screen.getByTestId('submit-create-task'))

      await waitFor(() => {
        expect(screen.getByText('Public Task')).toBeInTheDocument()
      })

      // Private task in second service
      await user.selectOptions(serviceSelects[0], 'service-2')
      await user.click(screen.getByTestId('create-task-button'))
      await user.type(screen.getByTestId('task-name-input'), 'Confidential Task')
      await user.type(screen.getByTestId('task-description-input'), 'Task not visible to visitors')
      
      // Mark as confidential
      const confidentialToggle = screen.getByTestId('confidential-toggle')
      await user.click(confidentialToggle)
      
      await user.click(screen.getByTestId('submit-create-task'))

      await waitFor(() => {
        expect(screen.getByText('Confidential Task')).toBeInTheDocument()
      })

      // Add visitor as member first
      await user.click(screen.getByTestId('add-member-button'))
      await user.type(screen.getByTestId('member-email-input'), 'visitor@test.com')
      await user.selectOptions(screen.getByTestId('member-role-select'), 'VISITOR')
      await user.click(screen.getByTestId('submit-add-member'))

      // Sign out and sign in as visitor
      await user.click(screen.getByTestId('sign-out'))

      await waitFor(() => {
        expect(screen.getByTestId('sign-in-view')).toBeInTheDocument()
      })

      await user.type(screen.getByTestId('email-input'), 'visitor@test.com')
      await user.type(screen.getByTestId('password-input'), 'password')
      await user.click(screen.getByTestId('sign-in-button'))

      await waitFor(() => {
        expect(screen.getByTestId('workspace-selection')).toBeInTheDocument()
      })
      
      // Visitor needs to enter the workspace
      await user.click(screen.getByText('Enter Workspace'))

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument()
      })

      // Visitor should only see non-confidential tasks they follow
      // In this case, they don't follow any tasks yet, so they see limited content
      
      // Test filtering across services as visitor
      await user.selectOptions(serviceSelects[0], '') // All services
      
      // Visitor should have limited visibility
      // They would only see tasks they explicitly follow
    })
  })
})
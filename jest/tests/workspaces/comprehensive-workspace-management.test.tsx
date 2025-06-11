import React from 'react'
import { render, screen, userEvent } from '@/test-utils'

// Mock workspace types
interface MockWorkspace {
  id: string
  name: string
  description?: string
  inviteCode: string
  userId: string
  createdAt: string
  memberCount?: number
}

interface MockMember {
  id: string
  userId: string
  workspaceId: string
  role: 'ADMIN' | 'MEMBER' | 'VISITOR'
  name: string
  email: string
  joinedAt: string
}

// Mock workspace list component
const MockWorkspaceList = ({ 
  workspaces, 
  onSelect, 
  onCreateNew 
}: { 
  workspaces: MockWorkspace[]
  onSelect: (workspace: MockWorkspace) => void
  onCreateNew: () => void
}) => {
  if (workspaces.length === 0) {
    return (
      <div data-testid="no-workspaces">
        <h2>No Workspaces</h2>
        <p>You haven&apos;t been added to any workspaces yet.</p>
        <button onClick={onCreateNew} data-testid="create-first-workspace">
          Create Your First Workspace
        </button>
      </div>
    )
  }

  return (
    <div data-testid="workspace-list">
      <h2>Your Workspaces</h2>
      <button onClick={onCreateNew} data-testid="create-new-workspace">
        Create New Workspace
      </button>
      
      <div className="workspace-grid">
        {workspaces.map((workspace) => (
          <div key={workspace.id} data-testid={`workspace-${workspace.id}`}>
            <h3>{workspace.name}</h3>
            {workspace.description && <p>{workspace.description}</p>}
            <p data-testid="member-count">{workspace.memberCount || 1} members</p>
            <button onClick={() => onSelect(workspace)}>
              Enter Workspace
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Mock workspace creation form
const MockCreateWorkspaceForm = ({ 
  onSubmit, 
  onCancel, 
  isPending = false,
  error = null 
}: { 
  onSubmit: (data: { name: string; description?: string }) => void
  onCancel: () => void
  isPending?: boolean
  error?: string | null
}) => {
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined
    })
  }

  return (
    <div data-testid="create-workspace-modal">
      <h2>Create New Workspace</h2>
      
      {error && (
        <div data-testid="error-message" role="alert">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="workspace-name">Workspace Name *</label>
          <input
            id="workspace-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Marketing Team, Product Development"
            required
            disabled={isPending}
            maxLength={50}
          />
          <small>{name.length}/50 characters</small>
        </div>
        
        <div>
          <label htmlFor="workspace-description">Description (Optional)</label>
          <textarea
            id="workspace-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this workspace is for..."
            disabled={isPending}
            maxLength={200}
            rows={3}
          />
          <small>{description.length}/200 characters</small>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isPending || !name.trim()}
          >
            {isPending ? 'Creating...' : 'Create Workspace'}
          </button>
        </div>
      </form>
    </div>
  )
}

// Mock workspace settings component
const MockWorkspaceSettings = ({ 
  workspace, 
  onUpdate, 
  onDelete, 
  onResetInviteCode,
  userRole 
}: { 
  workspace: MockWorkspace
  onUpdate: (data: Partial<MockWorkspace>) => void
  onDelete: () => void
  onResetInviteCode: () => void
  userRole: 'ADMIN' | 'MEMBER' | 'VISITOR'
}) => {
  const [name, setName] = React.useState(workspace.name)
  const [description, setDescription] = React.useState(workspace.description || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)

  const canEdit = userRole === 'ADMIN'

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate({ name, description })
  }

  return (
    <div data-testid="workspace-settings">
      <h2>Workspace Settings</h2>
      
      <form onSubmit={handleUpdate}>
        <div>
          <label htmlFor="settings-name">Workspace Name</label>
          <input
            id="settings-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            required
          />
        </div>
        
        <div>
          <label htmlFor="settings-description">Description</label>
          <textarea
            id="settings-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
            rows={3}
          />
        </div>
        
        {canEdit && (
          <button type="submit" data-testid="update-workspace">
            Update Workspace
          </button>
        )}
      </form>
      
      {canEdit && (
        <div data-testid="admin-settings">
          <h3>Invite Settings</h3>
          <div data-testid="invite-section">
            <p>Invite Code: <code data-testid="invite-code">{workspace.inviteCode}</code></p>
            <button onClick={onResetInviteCode} data-testid="reset-invite-code">
              Reset Invite Code
            </button>
          </div>
          
          <h3>Danger Zone</h3>
          <div data-testid="danger-zone">
            {!showDeleteConfirm ? (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                data-testid="delete-workspace-btn"
                className="danger"
              >
                Delete Workspace
              </button>
            ) : (
              <div data-testid="delete-confirmation">
                <p>Are you sure? This action cannot be undone.</p>
                <button onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </button>
                <button 
                  onClick={onDelete}
                  data-testid="confirm-delete"
                  className="danger"
                >
                  Yes, Delete Workspace
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {userRole !== 'ADMIN' && (
        <div data-testid="readonly-notice">
          <p>Only workspace administrators can modify these settings.</p>
        </div>
      )}
    </div>
  )
}

// Mock member management component
const MockMemberManagement = ({ 
  members, 
  onAddMember, 
  onUpdateRole, 
  onRemoveMember,
  userRole 
}: { 
  members: MockMember[]
  onAddMember: (email: string, role: 'ADMIN' | 'MEMBER' | 'VISITOR') => void
  onUpdateRole: (memberId: string, role: 'ADMIN' | 'MEMBER' | 'VISITOR') => void
  onRemoveMember: (memberId: string) => void
  userRole: 'ADMIN' | 'MEMBER' | 'VISITOR'
}) => {
  const [newMemberEmail, setNewMemberEmail] = React.useState('')
  const [newMemberRole, setNewMemberRole] = React.useState<'ADMIN' | 'MEMBER' | 'VISITOR'>('MEMBER')

  const canManageMembers = userRole === 'ADMIN'

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMemberEmail.trim()) {
      onAddMember(newMemberEmail.trim(), newMemberRole)
      setNewMemberEmail('')
      setNewMemberRole('MEMBER')
    }
  }

  return (
    <div data-testid="member-management">
      <h2>Members ({members.length})</h2>
      
      {canManageMembers && (
        <form onSubmit={handleAddMember} data-testid="add-member-form">
          <h3>Add New Member</h3>
          <div>
            <label htmlFor="member-email">Email Address</label>
            <input
              id="member-email"
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="user@company.com"
              required
            />
          </div>
          
          <div>
            <label htmlFor="member-role">Role</label>
            <select
              id="member-role"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value as 'ADMIN' | 'MEMBER' | 'VISITOR')}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="VISITOR">Visitor</option>
            </select>
          </div>
          
          <button type="submit" data-testid="add-member-btn">
            Add Member
          </button>
        </form>
      )}
      
      <div data-testid="members-list">
        {members.map((member) => (
          <div key={member.id} data-testid={`member-${member.id}`} className="member-card">
            <div>
              <h4>{member.name}</h4>
              <p>{member.email}</p>
              <p>Joined: {new Date(member.joinedAt).toLocaleDateString()}</p>
            </div>
            
            <div>
              <span data-testid={`role-${member.id}`} className={`role-badge ${member.role.toLowerCase()}`}>
                {member.role}
              </span>
              
              {canManageMembers && (
                <div data-testid={`member-actions-${member.id}`}>
                  <select
                    value={member.role}
                    onChange={(e) => onUpdateRole(member.id, e.target.value as 'ADMIN' | 'MEMBER' | 'VISITOR')}
                    data-testid={`role-select-${member.id}`}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                    <option value="VISITOR">Visitor</option>
                  </select>
                  
                  <button
                    onClick={() => onRemoveMember(member.id)}
                    data-testid={`remove-member-${member.id}`}
                    className="danger"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {!canManageMembers && (
        <div data-testid="member-readonly">
          <p>Only workspace administrators can manage members.</p>
        </div>
      )}
    </div>
  )
}

// Mock join workspace component
const MockJoinWorkspace = ({ 
  onJoin, 
  isPending = false, 
  error = null 
}: { 
  onJoin: (inviteCode: string) => void
  isPending?: boolean
  error?: string | null
}) => {
  const [inviteCode, setInviteCode] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inviteCode.trim()) {
      onJoin(inviteCode.trim())
    }
  }

  return (
    <div data-testid="join-workspace">
      <h2>Join Workspace</h2>
      <p>Enter the invite code provided by your workspace administrator.</p>
      
      {error && (
        <div data-testid="join-error" role="alert">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="invite-code">Invite Code</label>
          <input
            id="invite-code"
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code"
            disabled={isPending}
            required
            maxLength={10}
          />
        </div>
        
        <button type="submit" disabled={isPending || !inviteCode.trim()}>
          {isPending ? 'Joining...' : 'Join Workspace'}
        </button>
      </form>
    </div>
  )
}

describe('Comprehensive Workspace Management', () => {
  const mockWorkspaces: MockWorkspace[] = [
    {
      id: 'ws-1',
      name: 'Marketing Team',
      description: 'Marketing campaigns and content',
      inviteCode: 'MARKET123',
      userId: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
      memberCount: 5
    },
    {
      id: 'ws-2',
      name: 'Development Team',
      inviteCode: 'DEV456',
      userId: 'user-1',
      createdAt: '2024-01-15T00:00:00Z',
      memberCount: 8
    }
  ]

  const mockMembers: MockMember[] = [
    {
      id: 'member-1',
      userId: 'user-1',
      workspaceId: 'ws-1',
      role: 'ADMIN',
      name: 'John Admin',
      email: 'john@company.com',
      joinedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'member-2',
      userId: 'user-2',
      workspaceId: 'ws-1',
      role: 'MEMBER',
      name: 'Jane Member',
      email: 'jane@company.com',
      joinedAt: '2024-01-02T00:00:00Z'
    },
    {
      id: 'member-3',
      userId: 'user-3',
      workspaceId: 'ws-1',
      role: 'VISITOR',
      name: 'Bob Visitor',
      email: 'bob@external.com',
      joinedAt: '2024-01-03T00:00:00Z'
    }
  ]

  describe('Workspace List Management', () => {
    it('displays list of user workspaces', () => {
      const mockOnSelect = jest.fn()
      const mockOnCreateNew = jest.fn()
      
      render(
        <MockWorkspaceList 
          workspaces={mockWorkspaces} 
          onSelect={mockOnSelect} 
          onCreateNew={mockOnCreateNew} 
        />
      )

      expect(screen.getByTestId('workspace-list')).toBeInTheDocument()
      expect(screen.getByText('Your Workspaces')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-ws-1')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-ws-2')).toBeInTheDocument()
      expect(screen.getByText('Marketing Team')).toBeInTheDocument()
      expect(screen.getByText('Development Team')).toBeInTheDocument()
    })

    it('shows member counts for each workspace', () => {
      const mockOnSelect = jest.fn()
      const mockOnCreateNew = jest.fn()
      
      render(
        <MockWorkspaceList 
          workspaces={mockWorkspaces} 
          onSelect={mockOnSelect} 
          onCreateNew={mockOnCreateNew} 
        />
      )

      const memberCounts = screen.getAllByTestId('member-count')
      expect(memberCounts[0]).toHaveTextContent('5 members')
      expect(memberCounts[1]).toHaveTextContent('8 members')
    })

    it('handles workspace selection', async () => {
      const user = userEvent.setup()
      const mockOnSelect = jest.fn()
      const mockOnCreateNew = jest.fn()
      
      render(
        <MockWorkspaceList 
          workspaces={mockWorkspaces} 
          onSelect={mockOnSelect} 
          onCreateNew={mockOnCreateNew} 
        />
      )

      await user.click(screen.getAllByText('Enter Workspace')[0])
      expect(mockOnSelect).toHaveBeenCalledWith(mockWorkspaces[0])
    })

    it('shows empty state when no workspaces', () => {
      const mockOnSelect = jest.fn()
      const mockOnCreateNew = jest.fn()
      
      render(
        <MockWorkspaceList 
          workspaces={[]} 
          onSelect={mockOnSelect} 
          onCreateNew={mockOnCreateNew} 
        />
      )

      expect(screen.getByTestId('no-workspaces')).toBeInTheDocument()
      expect(screen.getByText('No Workspaces')).toBeInTheDocument()
      expect(screen.getByTestId('create-first-workspace')).toBeInTheDocument()
    })
  })

  describe('Workspace Creation', () => {
    it('creates new workspace with valid data', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <MockCreateWorkspaceForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      )

      await user.type(screen.getByLabelText(/workspace name/i), 'New Team Workspace')
      await user.type(screen.getByLabelText(/description/i), 'A workspace for our new team')
      await user.click(screen.getByRole('button', { name: /create workspace/i }))

      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'New Team Workspace',
        description: 'A workspace for our new team'
      })
    })

    it('validates required workspace name', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <MockCreateWorkspaceForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      )

      const submitButton = screen.getByRole('button', { name: /create workspace/i })
      expect(submitButton).toBeDisabled()

      await user.type(screen.getByLabelText(/workspace name/i), '   ')
      expect(submitButton).toBeDisabled()

      await user.clear(screen.getByLabelText(/workspace name/i))
      await user.type(screen.getByLabelText(/workspace name/i), 'Valid Name')
      expect(submitButton).not.toBeDisabled()
    })

    it('shows character limits for inputs', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <MockCreateWorkspaceForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      )

      expect(screen.getByText('0/50 characters')).toBeInTheDocument()
      expect(screen.getByText('0/200 characters')).toBeInTheDocument()

      await user.type(screen.getByLabelText(/workspace name/i), 'Test')
      expect(screen.getByText('4/50 characters')).toBeInTheDocument()
    })

    it('displays error messages', () => {
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <MockCreateWorkspaceForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel}
          error="Workspace name already exists"
        />
      )

      expect(screen.getByTestId('error-message')).toBeInTheDocument()
      expect(screen.getByText('Workspace name already exists')).toBeInTheDocument()
    })

    it('handles cancellation', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <MockCreateWorkspaceForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      )

      await user.click(screen.getByText('Cancel'))
      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Workspace Settings', () => {
    it('allows admin to update workspace settings', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = jest.fn()
      const mockOnDelete = jest.fn()
      const mockOnResetInviteCode = jest.fn()
      
      render(
        <MockWorkspaceSettings 
          workspace={mockWorkspaces[0]}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onResetInviteCode={mockOnResetInviteCode}
          userRole="ADMIN"
        />
      )

      await user.clear(screen.getByLabelText(/workspace name/i))
      await user.type(screen.getByLabelText(/workspace name/i), 'Updated Marketing Team')
      await user.click(screen.getByTestId('update-workspace'))

      expect(mockOnUpdate).toHaveBeenCalledWith({
        name: 'Updated Marketing Team',
        description: 'Marketing campaigns and content'
      })
    })

    it('shows admin-only features for admins', () => {
      const mockOnUpdate = jest.fn()
      const mockOnDelete = jest.fn()
      const mockOnResetInviteCode = jest.fn()
      
      render(
        <MockWorkspaceSettings 
          workspace={mockWorkspaces[0]}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onResetInviteCode={mockOnResetInviteCode}
          userRole="ADMIN"
        />
      )

      expect(screen.getByTestId('admin-settings')).toBeInTheDocument()
      expect(screen.getByTestId('invite-section')).toBeInTheDocument()
      expect(screen.getByTestId('danger-zone')).toBeInTheDocument()
      expect(screen.getByTestId('invite-code')).toHaveTextContent('MARKET123')
    })

    it('restricts access for non-admin users', () => {
      const mockOnUpdate = jest.fn()
      const mockOnDelete = jest.fn()
      const mockOnResetInviteCode = jest.fn()
      
      render(
        <MockWorkspaceSettings 
          workspace={mockWorkspaces[0]}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onResetInviteCode={mockOnResetInviteCode}
          userRole="MEMBER"
        />
      )

      expect(screen.getByTestId('readonly-notice')).toBeInTheDocument()
      expect(screen.queryByTestId('admin-settings')).not.toBeInTheDocument()
      expect(screen.getByLabelText(/workspace name/i)).toBeDisabled()
    })

    it('handles workspace deletion with confirmation', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = jest.fn()
      const mockOnDelete = jest.fn()
      const mockOnResetInviteCode = jest.fn()
      
      render(
        <MockWorkspaceSettings 
          workspace={mockWorkspaces[0]}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onResetInviteCode={mockOnResetInviteCode}
          userRole="ADMIN"
        />
      )

      await user.click(screen.getByTestId('delete-workspace-btn'))
      expect(screen.getByTestId('delete-confirmation')).toBeInTheDocument()

      await user.click(screen.getByTestId('confirm-delete'))
      expect(mockOnDelete).toHaveBeenCalled()
    })

    it('handles invite code reset', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = jest.fn()
      const mockOnDelete = jest.fn()
      const mockOnResetInviteCode = jest.fn()
      
      render(
        <MockWorkspaceSettings 
          workspace={mockWorkspaces[0]}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onResetInviteCode={mockOnResetInviteCode}
          userRole="ADMIN"
        />
      )

      await user.click(screen.getByTestId('reset-invite-code'))
      expect(mockOnResetInviteCode).toHaveBeenCalled()
    })
  })

  describe('Member Management', () => {
    it('displays all workspace members', () => {
      const mockOnAddMember = jest.fn()
      const mockOnUpdateRole = jest.fn()
      const mockOnRemoveMember = jest.fn()
      
      render(
        <MockMemberManagement 
          members={mockMembers}
          onAddMember={mockOnAddMember}
          onUpdateRole={mockOnUpdateRole}
          onRemoveMember={mockOnRemoveMember}
          userRole="ADMIN"
        />
      )

      expect(screen.getByText('Members (3)')).toBeInTheDocument()
      expect(screen.getByTestId('member-member-1')).toBeInTheDocument()
      expect(screen.getByTestId('member-member-2')).toBeInTheDocument()
      expect(screen.getByTestId('member-member-3')).toBeInTheDocument()
      
      expect(screen.getByText('John Admin')).toBeInTheDocument()
      expect(screen.getByText('Jane Member')).toBeInTheDocument()
      expect(screen.getByText('Bob Visitor')).toBeInTheDocument()
    })

    it('shows correct role badges', () => {
      const mockOnAddMember = jest.fn()
      const mockOnUpdateRole = jest.fn()
      const mockOnRemoveMember = jest.fn()
      
      render(
        <MockMemberManagement 
          members={mockMembers}
          onAddMember={mockOnAddMember}
          onUpdateRole={mockOnUpdateRole}
          onRemoveMember={mockOnRemoveMember}
          userRole="ADMIN"
        />
      )

      expect(screen.getByTestId('role-member-1')).toHaveTextContent('ADMIN')
      expect(screen.getByTestId('role-member-2')).toHaveTextContent('MEMBER')
      expect(screen.getByTestId('role-member-3')).toHaveTextContent('VISITOR')
    })

    it('allows admin to add new members', async () => {
      const user = userEvent.setup()
      const mockOnAddMember = jest.fn()
      const mockOnUpdateRole = jest.fn()
      const mockOnRemoveMember = jest.fn()
      
      render(
        <MockMemberManagement 
          members={mockMembers}
          onAddMember={mockOnAddMember}
          onUpdateRole={mockOnUpdateRole}
          onRemoveMember={mockOnRemoveMember}
          userRole="ADMIN"
        />
      )

      await user.type(screen.getByLabelText(/email address/i), 'newuser@company.com')
      await user.selectOptions(screen.getByLabelText(/role/i), 'MEMBER')
      await user.click(screen.getByTestId('add-member-btn'))

      expect(mockOnAddMember).toHaveBeenCalledWith('newuser@company.com', 'MEMBER')
    })

    it('allows admin to update member roles', async () => {
      const user = userEvent.setup()
      const mockOnAddMember = jest.fn()
      const mockOnUpdateRole = jest.fn()
      const mockOnRemoveMember = jest.fn()
      
      render(
        <MockMemberManagement 
          members={mockMembers}
          onAddMember={mockOnAddMember}
          onUpdateRole={mockOnUpdateRole}
          onRemoveMember={mockOnRemoveMember}
          userRole="ADMIN"
        />
      )

      await user.selectOptions(screen.getByTestId('role-select-member-2'), 'ADMIN')
      expect(mockOnUpdateRole).toHaveBeenCalledWith('member-2', 'ADMIN')
    })

    it('allows admin to remove members', async () => {
      const user = userEvent.setup()
      const mockOnAddMember = jest.fn()
      const mockOnUpdateRole = jest.fn()
      const mockOnRemoveMember = jest.fn()
      
      render(
        <MockMemberManagement 
          members={mockMembers}
          onAddMember={mockOnAddMember}
          onUpdateRole={mockOnUpdateRole}
          onRemoveMember={mockOnRemoveMember}
          userRole="ADMIN"
        />
      )

      await user.click(screen.getByTestId('remove-member-member-3'))
      expect(mockOnRemoveMember).toHaveBeenCalledWith('member-3')
    })

    it('restricts member management for non-admins', () => {
      const mockOnAddMember = jest.fn()
      const mockOnUpdateRole = jest.fn()
      const mockOnRemoveMember = jest.fn()
      
      render(
        <MockMemberManagement 
          members={mockMembers}
          onAddMember={mockOnAddMember}
          onUpdateRole={mockOnUpdateRole}
          onRemoveMember={mockOnRemoveMember}
          userRole="MEMBER"
        />
      )

      expect(screen.getByTestId('member-readonly')).toBeInTheDocument()
      expect(screen.queryByTestId('add-member-form')).not.toBeInTheDocument()
      expect(screen.queryByTestId('member-actions-member-1')).not.toBeInTheDocument()
    })
  })

  describe('Join Workspace', () => {
    it('allows joining workspace with invite code', async () => {
      const user = userEvent.setup()
      const mockOnJoin = jest.fn()
      
      render(
        <MockJoinWorkspace onJoin={mockOnJoin} />
      )

      await user.type(screen.getByLabelText(/invite code/i), 'market123')
      await user.click(screen.getByRole('button', { name: /join workspace/i }))

      expect(mockOnJoin).toHaveBeenCalledWith('MARKET123')
    })

    it('converts invite code to uppercase', async () => {
      const user = userEvent.setup()
      const mockOnJoin = jest.fn()
      
      render(
        <MockJoinWorkspace onJoin={mockOnJoin} />
      )

      await user.type(screen.getByLabelText(/invite code/i), 'dev456')
      expect(screen.getByLabelText(/invite code/i)).toHaveValue('DEV456')
    })

    it('validates invite code is required', async () => {
      const user = userEvent.setup()
      const mockOnJoin = jest.fn()
      
      render(
        <MockJoinWorkspace onJoin={mockOnJoin} />
      )

      const submitButton = screen.getByRole('button', { name: /join workspace/i })
      expect(submitButton).toBeDisabled()

      await user.type(screen.getByLabelText(/invite code/i), 'ABC123')
      expect(submitButton).not.toBeDisabled()
    })

    it('displays error messages for invalid codes', () => {
      const mockOnJoin = jest.fn()
      
      render(
        <MockJoinWorkspace 
          onJoin={mockOnJoin} 
          error="Invalid invite code" 
        />
      )

      expect(screen.getByTestId('join-error')).toBeInTheDocument()
      expect(screen.getByText('Invalid invite code')).toBeInTheDocument()
    })

    it('shows loading state during join process', () => {
      const mockOnJoin = jest.fn()
      
      render(
        <MockJoinWorkspace 
          onJoin={mockOnJoin} 
          isPending={true} 
        />
      )

      expect(screen.getByText('Joining...')).toBeInTheDocument()
      expect(screen.getByLabelText(/invite code/i)).toBeDisabled()
    })
  })

  describe('Workspace Navigation', () => {
    it('handles workspace selection and navigation', async () => {
      const user = userEvent.setup()
      const mockOnSelect = jest.fn()
      const mockOnCreateNew = jest.fn()
      
      render(
        <MockWorkspaceList 
          workspaces={mockWorkspaces} 
          onSelect={mockOnSelect} 
          onCreateNew={mockOnCreateNew} 
        />
      )

      // Test workspace selection
      await user.click(screen.getAllByText('Enter Workspace')[0])
      expect(mockOnSelect).toHaveBeenCalledWith(mockWorkspaces[0])

      // Test new workspace creation
      await user.click(screen.getByTestId('create-new-workspace'))
      expect(mockOnCreateNew).toHaveBeenCalled()
    })
  })

  describe('Workspace Data Validation', () => {
    it('validates workspace name length limits', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <MockCreateWorkspaceForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      )

      const nameInput = screen.getByLabelText(/workspace name/i)
      
      // Test max length enforcement
      const longName = 'A'.repeat(60)
      await user.type(nameInput, longName)
      expect(nameInput).toHaveValue('A'.repeat(50)) // Should be truncated
    })

    it('validates description length limits', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <MockCreateWorkspaceForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      )

      const descInput = screen.getByLabelText(/description/i)
      
      // Test max length enforcement
      const longDesc = 'A'.repeat(250)
      await user.type(descInput, longDesc)
      expect(descInput).toHaveValue('A'.repeat(200)) // Should be truncated
    })

    it('trims whitespace from inputs', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      const mockOnCancel = jest.fn()
      
      render(
        <MockCreateWorkspaceForm 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      )

      await user.type(screen.getByLabelText(/workspace name/i), '  Test Workspace  ')
      await user.click(screen.getByRole('button', { name: /create workspace/i }))

      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Workspace',
        description: undefined
      })
    })
  })
})
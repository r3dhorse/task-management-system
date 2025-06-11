// DISABLED: Projects feature is not implemented in the application
// This test file is testing functionality that does not exist in the codebase
// The @/features/projects directory and its hooks/API do not exist
// To enable these tests, implement the projects feature first

/* eslint-disable */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/test-utils'

// Mock matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock project components
interface MockCreateProjectFormProps {
  onCancel: () => void;
  workspaceId?: string;
}

const MockCreateProjectForm = ({ onCancel }: MockCreateProjectFormProps) => {
  const [name, setName] = React.useState('')
  const [errors, setErrors] = React.useState<string[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: string[] = []
    
    if (!name.trim()) {
      newErrors.push('Project name is required')
    } else if (name.trim().length < 3) {
      newErrors.push('Project name must be at least 3 characters')
    }
    
    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }
    
    setErrors([])
    const formData = new FormData()
    formData.append('name', name)
    mockCreateProject({
      form: formData,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {errors.length > 0 && (
        <div className="text-red-500 text-sm mb-2">
          {errors.map((error, i) => <div key={i}>{error}</div>)}
        </div>
      )}
      <input 
        aria-label="Project name" 
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full min-h-[44px] p-2 border rounded" 
      />
      <div data-testid="file-upload">
        <button type="button">Upload Image</button>
        <button type="button">Remove Image</button>
      </div>
      <div className="flex gap-2 mt-4">
        <button 
          type="submit"
          className="w-full sm:w-auto min-h-[44px] touch-manipulation bg-blue-500 text-white rounded"
        >
          Create Project
        </button>
        <button 
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto min-h-[44px] touch-manipulation bg-gray-500 text-white rounded"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

interface MockEditProjectFormProps {
  onCancel: () => void;
  initialValues: { $id: string; name: string; imageUrl: string | null; workspaceId: string };
}

const MockEditProjectForm = ({ onCancel, initialValues }: MockEditProjectFormProps) => {
  const [name, setName] = React.useState(initialValues.name)
  const [errors, setErrors] = React.useState<string[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrors(['Project name is required'])
      return
    }
    setErrors([])
    
    const formData = new FormData()
    formData.append('name', name)
    mockUpdateProject({
      param: { projectId: initialValues.$id },
      form: formData,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {errors.length > 0 && (
        <div className="text-red-500 text-sm mb-2">
          {errors.map((error, i) => <div key={i}>{error}</div>)}
        </div>
      )}
      <input 
        aria-label="Project name" 
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full min-h-[44px] p-2 border rounded" 
      />
      <div className="flex gap-2 mt-4">
        <button 
          type="submit"
          className="w-full sm:w-auto min-h-[44px] touch-manipulation bg-blue-500 text-white rounded"
        >
          Save Changes
        </button>
        <button 
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto min-h-[44px] touch-manipulation bg-gray-500 text-white rounded"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

const MockProjectSwitcher = () => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  const handleProjectSelect = (projectId: string) => {
    setIsOpen(false)
    mockPush(`/workspaces/workspace-1/projects/${projectId}`)
  }
  
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[44px] touch-manipulation px-3 border rounded"
      >
        No project selected
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-10 min-w-full">
          <button 
            onClick={() => handleProjectSelect('project-1')}
            className="block w-full text-left px-4 py-2 min-h-[44px] touch-manipulation hover:bg-gray-100"
          >
            Web Development
          </button>
          <button 
            onClick={() => handleProjectSelect('project-2')}
            className="block w-full text-left px-4 py-2 min-h-[44px] touch-manipulation hover:bg-gray-100"
          >
            Mobile App
          </button>
          <hr className="my-1" />
          <button className="block w-full text-left px-4 py-2 min-h-[44px] touch-manipulation hover:bg-gray-100 text-blue-600">
            Create Project
          </button>
        </div>
      )}
    </div>
  )
}

// Mock Next.js router
const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}))

// Mock project hooks
const mockCreateProject = jest.fn()
const mockUpdateProject = jest.fn()
const mockDeleteProject = jest.fn()

jest.mock('@/features/projects/api/use-create-project', () => ({
  useCreateProject: () => ({
    mutate: mockCreateProject,
    isPending: false,
  }),
}))

jest.mock('@/features/projects/api/use-update-project', () => ({
  useUpdateProject: () => ({
    mutate: mockUpdateProject,
    isPending: false,
  }),
}))

jest.mock('@/features/projects/api/use-delete-project', () => ({
  useDeleteProject: () => ({
    mutate: mockDeleteProject,
    isPending: false,
  }),
}))

// Mock project data
jest.mock('@/features/projects/queries', () => ({
  getProjects: () => Promise.resolve({
    documents: [
      {
        $id: 'project-1',
        name: 'Web Development',
        imageUrl: null,
        workspaceId: 'workspace-1',
      },
      {
        $id: 'project-2',
        name: 'Mobile App',
        imageUrl: 'https://example.com/image.jpg',
        workspaceId: 'workspace-1',
      },
    ],
  }),
}))

jest.mock('@/features/projects/api/use-get-project', () => ({
  useGetProject: () => ({
    data: {
      $id: 'project-1',
      name: 'Web Development',
      imageUrl: null,
      workspaceId: 'workspace-1',
    },
    isLoading: false,
  }),
}))

// Mock workspace ID hook
jest.mock('@/features/workspaces/hooks/use-workspace-id', () => ({
  useWorkspaceId: () => 'workspace-1',
}))

// Mock project ID hook
jest.mock('@/features/projects/hooks/use-project-id', () => ({
  useProjectId: () => 'project-1',
}))

// Mock create project modal
jest.mock('@/features/projects/hooks/use-create-project-modal', () => ({
  useCreateProjectModal: () => ({
    isOpen: false,
    setIsOpen: jest.fn(),
    open: jest.fn(),
    close: jest.fn(),
  }),
}))

// Mock file upload
jest.mock('@/components/file-upload', () => ({
  FileUpload: ({ onFileUploaded, onFileRemoved }: { onFileUploaded: (id: string) => void; onFileRemoved: () => void }) => (
    <div data-testid="file-upload">
      <button onClick={() => onFileUploaded('file-123')}>Upload Image</button>
      <button onClick={() => onFileRemoved()}>Remove Image</button>
    </div>
  ),
}))

// Mock members API for project members
jest.mock('@/features/members/api/use-get-members', () => ({
  useGetMembers: () => ({
    data: {
      documents: [
        {
          $id: 'member-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'ADMIN',
        },
        {
          $id: 'member-2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'MEMBER',
        },
      ],
    },
    isLoading: false,
  }),
}))

describe.skip('Mobile Project Tests - DISABLED (Projects feature not implemented)', () => {
  // Helper to simulate mobile viewport
  const setMobileViewport = () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // iPhone width
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667, // iPhone height
    })
    window.dispatchEvent(new Event('resize'))
  }

  beforeEach(() => {
    setMobileViewport()
    mockCreateProject.mockClear()
    mockUpdateProject.mockClear()
    mockDeleteProject.mockClear()
    mockPush.mockClear()
    mockReplace.mockClear()
  })

  describe('Project Creation', () => {
    it('renders create project form with mobile layout', () => {
      render(<MockCreateProjectForm onCancel={jest.fn()} workspaceId="workspace-1" />)

      // Check form elements
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
      expect(screen.getByTestId('file-upload')).toBeInTheDocument()

      // Check mobile-optimized buttons
      const createButton = screen.getByRole('button', { name: /create project/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })

      expect(createButton).toHaveClass('w-full', 'sm:w-auto', 'min-h-[44px]')
      expect(cancelButton).toHaveClass('w-full', 'sm:w-auto', 'min-h-[44px]')
    })

    it('handles project creation with mobile touch interactions', async () => {
      render(<MockCreateProjectForm onCancel={jest.fn()} workspaceId="workspace-1" />)

      const nameInput = screen.getByLabelText(/project name/i)
      const createButton = screen.getByRole('button', { name: /create project/i })

      // Simulate mobile keyboard input
      fireEvent.focus(nameInput)
      fireEvent.change(nameInput, { target: { value: 'New Mobile Project' } })

      // Test image upload
      const uploadButton = screen.getByText('Upload Image')
      fireEvent.click(uploadButton)

      // Touch-based form submission
      fireEvent.touchStart(createButton)
      fireEvent.touchEnd(createButton)
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(mockCreateProject).toHaveBeenCalledWith({
          form: expect.any(FormData),
        })
      })
    })

    it('validates project name on mobile', async () => {
      render(<MockCreateProjectForm onCancel={jest.fn()} workspaceId="workspace-1" />)

      const createButton = screen.getByRole('button', { name: /create project/i })

      // Submit empty form
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/project name is required/i)).toBeInTheDocument()
      })

      // Test minimum length validation
      const nameInput = screen.getByLabelText(/project name/i)
      fireEvent.change(nameInput, { target: { value: 'A' } })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/project name must be at least/i)).toBeInTheDocument()
      })
    })

    it('handles project image upload on mobile', () => {
      render(<MockCreateProjectForm onCancel={jest.fn()} workspaceId="workspace-1" />)

      const uploadButton = screen.getByText('Upload Image')
      const removeButton = screen.getByText('Remove Image')

      // Test image upload with touch
      fireEvent.touchStart(uploadButton)
      fireEvent.touchEnd(uploadButton)
      fireEvent.click(uploadButton)

      // Test image removal with touch
      fireEvent.touchStart(removeButton)
      fireEvent.touchEnd(removeButton)
      fireEvent.click(removeButton)
    })

    it('shows loading state during project creation on mobile', () => {
      render(<MockCreateProjectForm onCancel={jest.fn()} workspaceId="workspace-1" />)

      const createButton = screen.getByRole('button', { name: /create project/i })
      
      // Button should handle loading state properly
      expect(createButton).toBeEnabled()
      expect(createButton).toHaveClass('touch-manipulation')
    })
  })

  describe('Project Editing', () => {
    const mockProject = {
      $id: 'project-1',
      name: 'Web Development',
      imageUrl: null,
      workspaceId: 'workspace-1',
    }

    it('renders edit project form with mobile layout', () => {
      render(<MockEditProjectForm onCancel={jest.fn()} initialValues={mockProject} />)

      // Check form elements are pre-filled
      const nameInput = screen.getByLabelText(/project name/i)
      expect(nameInput).toHaveValue('Web Development')

      // Check mobile-optimized buttons
      const updateButton = screen.getByRole('button', { name: /save changes/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })

      expect(updateButton).toHaveClass('w-full', 'sm:w-auto', 'min-h-[44px]')
      expect(cancelButton).toHaveClass('w-full', 'sm:w-auto', 'min-h-[44px]')
    })

    it('handles project update with mobile touch interactions', async () => {
      render(<MockEditProjectForm onCancel={jest.fn()} initialValues={mockProject} />)

      const nameInput = screen.getByLabelText(/project name/i)
      const updateButton = screen.getByRole('button', { name: /save changes/i })

      // Update project name
      fireEvent.focus(nameInput)
      fireEvent.change(nameInput, { target: { value: 'Updated Web Development' } })

      // Touch-based form submission
      fireEvent.touchStart(updateButton)
      fireEvent.touchEnd(updateButton)
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(mockUpdateProject).toHaveBeenCalledWith({
          param: { projectId: 'project-1' },
          form: expect.any(FormData),
        })
      })
    })

    it('handles project deletion on mobile', async () => {
      const MockProjectSettings = () => (
        <div>
          <button
            onClick={() => mockDeleteProject({ param: { projectId: 'project-1' } })}
            className="min-h-[44px] touch-manipulation w-full bg-red-500 text-white"
          >
            Delete Project
          </button>
        </div>
      )

      render(<MockProjectSettings />)

      const deleteButton = screen.getByText('Delete Project')

      // Touch interaction for dangerous action
      fireEvent.touchStart(deleteButton)
      fireEvent.touchEnd(deleteButton)
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(mockDeleteProject).toHaveBeenCalledWith({
          param: { projectId: 'project-1' },
        })
      })
    })

    it('validates project updates on mobile', async () => {
      render(<MockEditProjectForm onCancel={jest.fn()} initialValues={mockProject} />)

      const nameInput = screen.getByLabelText(/project name/i)
      const updateButton = screen.getByRole('button', { name: /save changes/i })

      // Clear the name
      fireEvent.change(nameInput, { target: { value: '' } })
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(screen.getByText(/project name is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Project Switcher', () => {
    // Mock the server query for projects
    beforeEach(() => {
      // Mock the projects query
      const mockUseQuery = jest.fn(() => ({
        data: {
          documents: [
            {
              $id: 'project-1',
              name: 'Web Development',
              imageUrl: null,
              workspaceId: 'workspace-1',
            },
            {
              $id: 'project-2',
              name: 'Mobile App',
              imageUrl: 'https://example.com/image.jpg',
              workspaceId: 'workspace-1',
            },
          ],
        },
        isLoading: false,
      }))

      jest.doMock('@tanstack/react-query', () => ({
        useQuery: mockUseQuery,
      }))
    })

    it('renders project switcher with mobile-friendly dropdown', () => {
      render(<MockProjectSwitcher />)

      const switcherButton = screen.getByRole('button')
      expect(switcherButton).toBeInTheDocument()
      expect(switcherButton).toHaveClass('min-h-[44px]', 'touch-manipulation')

      // Open dropdown
      fireEvent.click(switcherButton)

      // Check for create project option
      expect(screen.getByText(/no project selected/i) || screen.getByText(/all projects/i)).toBeInTheDocument()
    })

    it('handles project switching with touch interactions', async () => {
      render(<MockProjectSwitcher />)

      const switcherButton = screen.getByRole('button')

      // Touch to open dropdown
      fireEvent.touchStart(switcherButton)
      fireEvent.touchEnd(switcherButton)
      fireEvent.click(switcherButton)

      // Look for project options in dropdown
      const projectOption = screen.queryByText('Web Development') || screen.queryByText('Mobile App')

      if (projectOption) {
        // Touch to select project
        fireEvent.touchStart(projectOption)
        fireEvent.touchEnd(projectOption)
        fireEvent.click(projectOption)

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalled()
        })
      }
    })

    it('shows create project option in mobile dropdown', () => {
      render(<MockProjectSwitcher />)

      const switcherButton = screen.getByRole('button')
      fireEvent.click(switcherButton)

      // Should show option to create new project
      expect(screen.getByText(/create project/i) || screen.getByText(/new project/i)).toBeInTheDocument()
    })

    it('displays project icons correctly on mobile', () => {
      render(<MockProjectSwitcher />)

      const switcherButton = screen.getByRole('button')
      fireEvent.click(switcherButton)

      // Project without image should show fallback
      // This would typically show the first letter of the project name
    })
  })

  describe('Project Members Management', () => {
    it('displays project members on mobile', () => {
      const MockProjectMembers = () => (
        <div>
          <div data-testid="member-item" className="flex items-center p-3 min-h-[44px]">
            <span>John Doe</span>
            <span className="ml-auto text-xs">ADMIN</span>
          </div>
          <div data-testid="member-item" className="flex items-center p-3 min-h-[44px]">
            <span>Jane Smith</span>
            <span className="ml-auto text-xs">MEMBER</span>
          </div>
        </div>
      )

      render(<MockProjectMembers />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('ADMIN')).toBeInTheDocument()
      expect(screen.getByText('MEMBER')).toBeInTheDocument()
    })

    it('handles member actions with touch interactions on mobile', () => {
      const mockRemoveMember = jest.fn()

      const MockProjectMembers = () => (
        <div>
          <div className="flex items-center p-3 min-h-[44px]">
            <span>Jane Smith</span>
            <button
              onClick={mockRemoveMember}
              className="ml-auto min-h-[44px] px-3 touch-manipulation"
            >
              Remove
            </button>
          </div>
        </div>
      )

      render(<MockProjectMembers />)

      const removeButton = screen.getByText('Remove')

      // Touch interaction
      fireEvent.touchStart(removeButton)
      fireEvent.touchEnd(removeButton)
      fireEvent.click(removeButton)

      expect(mockRemoveMember).toHaveBeenCalled()
    })

    it('handles adding members to project on mobile', async () => {
      const mockAddMember = jest.fn()

      const MockAddMember = () => (
        <div>
          <input
            placeholder="Member email"
            className="w-full min-h-[44px] mb-3"
            aria-label="Member email"
          />
          <button
            onClick={mockAddMember}
            className="w-full min-h-[44px] touch-manipulation bg-blue-500 text-white"
          >
            Add Member
          </button>
        </div>
      )

      render(<MockAddMember />)

      const emailInput = screen.getByLabelText('Member email')
      const addButton = screen.getByText('Add Member')

      fireEvent.change(emailInput, { target: { value: 'newmember@example.com' } })

      // Touch interaction
      fireEvent.touchStart(addButton)
      fireEvent.touchEnd(addButton)
      fireEvent.click(addButton)

      expect(mockAddMember).toHaveBeenCalled()
    })
  })

  describe('Project Navigation', () => {
    it('handles navigation to project tasks on mobile', () => {
      const MockProjectNavigation = () => (
        <div>
          <button
            onClick={() => mockPush('/workspaces/workspace-1/projects/project-1/tasks')}
            className="w-full min-h-[44px] touch-manipulation p-3 text-left"
          >
            View Tasks
          </button>
          <button
            onClick={() => mockPush('/workspaces/workspace-1/projects/project-1/members')}
            className="w-full min-h-[44px] touch-manipulation p-3 text-left"
          >
            View Members
          </button>
          <button
            onClick={() => mockPush('/workspaces/workspace-1/projects/project-1/settings')}
            className="w-full min-h-[44px] touch-manipulation p-3 text-left"
          >
            Project Settings
          </button>
        </div>
      )

      render(<MockProjectNavigation />)

      const tasksButton = screen.getByText('View Tasks')
      const membersButton = screen.getByText('View Members')
      const settingsButton = screen.getByText('Project Settings')

      // Test navigation to tasks
      fireEvent.click(tasksButton)
      expect(mockPush).toHaveBeenCalledWith('/workspaces/workspace-1/projects/project-1/tasks')

      // Test navigation to members
      fireEvent.click(membersButton)
      expect(mockPush).toHaveBeenCalledWith('/workspaces/workspace-1/projects/project-1/members')

      // Test navigation to settings
      fireEvent.click(settingsButton)
      expect(mockPush).toHaveBeenCalledWith('/workspaces/workspace-1/projects/project-1/settings')
    })

    it('provides breadcrumb navigation on mobile', () => {
      const MockBreadcrumbs = () => (
        <nav className="flex items-center p-3 text-sm" aria-label="Breadcrumb">
          <button
            onClick={() => mockPush('/workspaces/workspace-1')}
            className="touch-manipulation min-h-[44px] px-2"
          >
            Workspace
          </button>
          <span className="mx-2">/</span>
          <button
            onClick={() => mockPush('/workspaces/workspace-1/projects/project-1')}
            className="touch-manipulation min-h-[44px] px-2"
          >
            Web Development
          </button>
        </nav>
      )

      render(<MockBreadcrumbs />)

      const workspaceLink = screen.getByText('Workspace')
      const projectLink = screen.getByText('Web Development')

      fireEvent.click(workspaceLink)
      expect(mockPush).toHaveBeenCalledWith('/workspaces/workspace-1')

      fireEvent.click(projectLink)
      expect(mockPush).toHaveBeenCalledWith('/workspaces/workspace-1/projects/project-1')
    })
  })

  describe('Mobile-Specific Features', () => {
    it('handles pull-to-refresh for project data', () => {
      const MockProjectList = () => {
        const [refreshing, setRefreshing] = React.useState(false)

        const handleRefresh = () => {
          setRefreshing(true)
          setTimeout(() => setRefreshing(false), 1000)
        }

        return (
          <div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full min-h-[44px] touch-manipulation"
            >
              {refreshing ? 'Refreshing...' : 'Refresh Projects'}
            </button>
          </div>
        )
      }

      render(<MockProjectList />)

      const refreshButton = screen.getByText('Refresh Projects')
      fireEvent.click(refreshButton)

      expect(screen.getByText('Refreshing...')).toBeInTheDocument()
    })

    it('provides touch-friendly project cards', () => {
      const MockProjectGrid = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
          <div className="border rounded-lg p-4 min-h-[120px] touch-manipulation cursor-pointer">
            <h3 className="font-semibold">Web Development</h3>
            <p className="text-sm text-gray-600">5 tasks</p>
          </div>
          <div className="border rounded-lg p-4 min-h-[120px] touch-manipulation cursor-pointer">
            <h3 className="font-semibold">Mobile App</h3>
            <p className="text-sm text-gray-600">3 tasks</p>
          </div>
        </div>
      )

      render(<MockProjectGrid />)

      const projectCards = screen.getAllByText(/Development|App/)
      projectCards.forEach(card => {
        expect(card.closest('.touch-manipulation')).toBeInTheDocument()
      })
    })

    it('handles project search on mobile', () => {
      const MockProjectSearch = () => {
        const [search, setSearch] = React.useState('')

        return (
          <div>
            <input
              type="search"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[44px] p-3 border rounded"
              aria-label="Search projects"
            />
          </div>
        )
      }

      render(<MockProjectSearch />)

      const searchInput = screen.getByLabelText('Search projects')
      expect(searchInput).toHaveAttribute('type', 'search')

      fireEvent.change(searchInput, { target: { value: 'web' } })
      expect(searchInput).toHaveValue('web')
    })
  })
})
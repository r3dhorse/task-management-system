import React from 'react'
import { render, screen, userEvent } from '@/test-utils'

// Mock task form component
interface MockTaskFormProps {
  onSubmit: (data: {
    name: FormDataEntryValue | null
    description: FormDataEntryValue | null
    projectId: FormDataEntryValue | null
    assigneeId: FormDataEntryValue | null
    status: FormDataEntryValue | string
  }) => void
  isPending?: boolean
  projects?: Array<{ id: string; name: string }>
  members?: Array<{ id: string; name: string }>
}

const MockTaskForm = ({ 
  onSubmit, 
  isPending = false,
  projects = [],
  members = [] 
}: MockTaskFormProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    onSubmit({
      name: formData.get('name'),
      description: formData.get('description'),
      projectId: formData.get('projectId'),
      assigneeId: formData.get('assigneeId'),
      status: formData.get('status') || 'TODO',
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Task</h2>
      
      <label htmlFor="name">Task Name</label>
      <input 
        id="name" 
        name="name" 
        placeholder="Enter task name" 
        required 
        disabled={isPending}
      />
      
      <label htmlFor="description">Description</label>
      <textarea 
        id="description" 
        name="description" 
        placeholder="Task description" 
        disabled={isPending}
      />
      
      <label htmlFor="projectId">Project</label>
      <select id="projectId" name="projectId" disabled={isPending}>
        <option value="">Select project</option>
        {projects.map(project => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      
      <label htmlFor="assigneeId">Assignee</label>
      <select id="assigneeId" name="assigneeId" disabled={isPending}>
        <option value="">Select assignee</option>
        {members.map(member => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
      
      <label htmlFor="status">Status</label>
      <select id="status" name="status" disabled={isPending}>
        <option value="BACKLOG">Backlog</option>
        <option value="TODO">Todo</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="IN_REVIEW">In Review</option>
        <option value="DONE">Done</option>
      </select>
      
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Task'}
      </button>
    </form>
  )
}

describe('Task Form', () => {
  const mockProjects = [
    { id: 'project-1', name: 'Project Alpha' },
    { id: 'project-2', name: 'Project Beta' },
  ]

  const mockMembers = [
    { id: 'user-1', name: 'John Doe' },
    { id: 'user-2', name: 'Jane Smith' },
  ]

  it('renders task creation form', () => {
    const mockOnSubmit = jest.fn()
    render(
      <MockTaskForm 
        onSubmit={mockOnSubmit} 
        projects={mockProjects}
        members={mockMembers}
      />
    )

    expect(screen.getByRole('heading', { name: /create task/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/task name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/project/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/assignee/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it('submits task with all fields', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = jest.fn()
    
    render(
      <MockTaskForm 
        onSubmit={mockOnSubmit} 
        projects={mockProjects}
        members={mockMembers}
      />
    )

    await user.type(screen.getByLabelText(/task name/i), 'New Task')
    await user.type(screen.getByLabelText(/description/i), 'Task description')
    await user.selectOptions(screen.getByLabelText(/project/i), 'project-1')
    await user.selectOptions(screen.getByLabelText(/assignee/i), 'user-1')
    await user.selectOptions(screen.getByLabelText(/status/i), 'IN_PROGRESS')
    
    await user.click(screen.getByRole('button', { name: /create task/i }))

    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'New Task',
      description: 'Task description',
      projectId: 'project-1',
      assigneeId: 'user-1',
      status: 'IN_PROGRESS',
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = jest.fn()
    
    render(<MockTaskForm onSubmit={mockOnSubmit} />)

    await user.click(screen.getByRole('button', { name: /create task/i }))

    // Form validation prevents submission
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('disables form during submission', () => {
    const mockOnSubmit = jest.fn()
    render(<MockTaskForm onSubmit={mockOnSubmit} isPending={true} />)

    expect(screen.getByLabelText(/task name/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
  })
})
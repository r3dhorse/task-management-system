import React from 'react'
import { render, screen, userEvent } from '@/test-utils'

// Mock workspace creation component
interface MockCreateWorkspaceFormProps {
  onSubmit: (data: { name: FormDataEntryValue | null }) => void
  isPending?: boolean
}

const MockCreateWorkspaceForm = ({ onSubmit, isPending = false }: MockCreateWorkspaceFormProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    onSubmit({
      name: formData.get('name'),
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create a new workspace</h2>
      <label htmlFor="name">Workspace Name</label>
      <input 
        id="name" 
        name="name" 
        placeholder="Enter workspace name" 
        required 
        disabled={isPending}
      />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Workspace'}
      </button>
    </form>
  )
}

describe('Create Workspace', () => {
  it('renders create workspace form', () => {
    const mockOnSubmit = jest.fn()
    render(<MockCreateWorkspaceForm onSubmit={mockOnSubmit} />)

    expect(screen.getByText(/create a new workspace/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create workspace/i })).toBeInTheDocument()
  })

  it('submits workspace creation with name', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = jest.fn()
    
    render(<MockCreateWorkspaceForm onSubmit={mockOnSubmit} />)

    await user.type(screen.getByLabelText(/workspace name/i), 'My New Workspace')
    await user.click(screen.getByRole('button', { name: /create workspace/i }))

    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'My New Workspace',
    })
  })

  it('disables form during creation', () => {
    const mockOnSubmit = jest.fn()
    render(<MockCreateWorkspaceForm onSubmit={mockOnSubmit} isPending={true} />)

    expect(screen.getByLabelText(/workspace name/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
  })

  it('validates workspace name is required', async () => {
    const user = userEvent.setup()
    const mockOnSubmit = jest.fn()
    
    render(<MockCreateWorkspaceForm onSubmit={mockOnSubmit} />)

    await user.click(screen.getByRole('button', { name: /create workspace/i }))

    // Form validation prevents submission
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })
})
import React from 'react'
import { render, screen } from '@/test-utils'

// Mock typography components
interface MockHeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6
  children: React.ReactNode
  className?: string
}

const MockHeading = ({ level, children, className = '' }: MockHeadingProps) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  return React.createElement(Tag, { className }, children)
}

interface MockLabelProps {
  children: React.ReactNode
  htmlFor?: string
  className?: string
}

const MockLabel = ({ children, htmlFor, className = '' }: MockLabelProps) => (
  <label htmlFor={htmlFor} className={className}>
    {children}
  </label>
)

interface MockErrorTextProps {
  children: React.ReactNode
  className?: string
}

const MockErrorText = ({ children, className = 'text-red-500 text-sm' }: MockErrorTextProps) => (
  <span className={className} role="alert">
    {children}
  </span>
)

interface MockBadgeProps {
  variant: 'default' | 'success' | 'warning' | 'error' | 'secondary'
  children: React.ReactNode
}

const MockBadge = ({ variant, children }: MockBadgeProps) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-900',
    success: 'bg-green-100 text-green-900',
    warning: 'bg-yellow-100 text-yellow-900',
    error: 'bg-red-100 text-red-900',
    secondary: 'bg-blue-100 text-blue-900',
  }
  
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}

describe('Typography Components', () => {
  describe('Headings', () => {
    it('renders h1 heading correctly', () => {
      render(<MockHeading level={1}>Create a new task</MockHeading>)
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('Create a new task')
    })

    it('renders h2 heading correctly', () => {
      render(<MockHeading level={2}>Workspace Members</MockHeading>)
      
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('Workspace Members')
    })

    it('renders h3 heading correctly', () => {
      render(<MockHeading level={3}>Project Settings</MockHeading>)
      
      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading).toHaveTextContent('Project Settings')
    })

    it('applies custom classes to headings', () => {
      render(
        <MockHeading level={1} className="text-3xl font-bold text-gray-900">
          Custom Heading
        </MockHeading>
      )
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveClass('text-3xl', 'font-bold', 'text-gray-900')
    })
  })

  describe('Form Labels', () => {
    it('renders form label correctly', () => {
      render(<MockLabel htmlFor="task-name">Task Name</MockLabel>)
      
      const label = screen.getByText('Task Name')
      expect(label).toBeInTheDocument()
      expect(label).toHaveAttribute('for', 'task-name')
    })

    it('renders required field label', () => {
      render(
        <MockLabel htmlFor="email">
          Email Address <span className="text-red-500">*</span>
        </MockLabel>
      )
      
      const label = screen.getByText('Email Address')
      const required = screen.getByText('*')
      expect(label).toBeInTheDocument()
      expect(required).toHaveClass('text-red-500')
    })

    it('renders optional field label', () => {
      render(
        <MockLabel htmlFor="description">
          Description <span className="text-gray-500">(Optional)</span>
        </MockLabel>
      )
      
      const label = screen.getByText('Description')
      const optional = screen.getByText('(Optional)')
      expect(label).toBeInTheDocument()
      expect(optional).toHaveClass('text-gray-500')
    })
  })

  describe('Error Messages', () => {
    it('renders validation error message', () => {
      render(<MockErrorText>Task name is required</MockErrorText>)
      
      const error = screen.getByRole('alert')
      expect(error).toHaveTextContent('Task name is required')
      expect(error).toHaveClass('text-red-500', 'text-sm')
    })

    it('renders email validation error', () => {
      render(<MockErrorText>Invalid email address</MockErrorText>)
      
      const error = screen.getByRole('alert')
      expect(error).toHaveTextContent('Invalid email address')
    })

    it('renders password validation error', () => {
      render(<MockErrorText>Password must be at least 8 characters</MockErrorText>)
      
      const error = screen.getByRole('alert')
      expect(error).toHaveTextContent('Password must be at least 8 characters')
    })

    it('renders file upload error', () => {
      render(<MockErrorText>Only PDF files are allowed</MockErrorText>)
      
      const error = screen.getByRole('alert')
      expect(error).toHaveTextContent('Only PDF files are allowed')
    })

    it('renders network error message', () => {
      render(<MockErrorText>Failed to upload file. Please try again.</MockErrorText>)
      
      const error = screen.getByRole('alert')
      expect(error).toHaveTextContent('Failed to upload file. Please try again.')
    })
  })

  describe('Success Messages', () => {
    it('renders success message', () => {
      render(
        <span className="text-green-600 text-sm" role="status">
          File uploaded successfully
        </span>
      )
      
      const success = screen.getByRole('status')
      expect(success).toHaveTextContent('File uploaded successfully')
      expect(success).toHaveClass('text-green-600')
    })

    it('renders task creation success', () => {
      render(
        <span className="text-green-600 text-sm" role="status">
          Task created successfully
        </span>
      )
      
      const success = screen.getByRole('status')
      expect(success).toHaveTextContent('Task created successfully')
    })
  })

  describe('Status Badges', () => {
    it('renders TODO status badge', () => {
      render(<MockBadge variant="secondary">Todo</MockBadge>)
      
      const badge = screen.getByText('Todo')
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-900')
    })

    it('renders IN_PROGRESS status badge', () => {
      render(<MockBadge variant="warning">In Progress</MockBadge>)
      
      const badge = screen.getByText('In Progress')
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-900')
    })

    it('renders DONE status badge', () => {
      render(<MockBadge variant="success">Done</MockBadge>)
      
      const badge = screen.getByText('Done')
      expect(badge).toHaveClass('bg-green-100', 'text-green-900')
    })

    it('renders BACKLOG status badge', () => {
      render(<MockBadge variant="default">Backlog</MockBadge>)
      
      const badge = screen.getByText('Backlog')
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-900')
    })

    it('renders Admin role badge', () => {
      render(<MockBadge variant="error">Admin</MockBadge>)
      
      const badge = screen.getByText('Admin')
      expect(badge).toHaveClass('bg-red-100', 'text-red-900')
    })

    it('renders Member role badge', () => {
      render(<MockBadge variant="default">Member</MockBadge>)
      
      const badge = screen.getByText('Member')
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-900')
    })

    it('renders You identifier badge', () => {
      render(<MockBadge variant="secondary">You</MockBadge>)
      
      const badge = screen.getByText('You')
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-900')
    })
  })

  describe('Placeholder Text', () => {
    it('displays correct placeholder for task name input', () => {
      render(<input placeholder="Enter task name" />)
      
      const input = screen.getByPlaceholderText('Enter task name')
      expect(input).toBeInTheDocument()
    })

    it('displays correct placeholder for workspace name input', () => {
      render(<input placeholder="Enter workspace name" />)
      
      const input = screen.getByPlaceholderText('Enter workspace name')
      expect(input).toBeInTheDocument()
    })

    it('displays correct placeholder for description textarea', () => {
      render(<textarea placeholder="Enter workspace description" />)
      
      const textarea = screen.getByPlaceholderText('Enter workspace description')
      expect(textarea).toBeInTheDocument()
    })

    it('displays correct placeholder for search input', () => {
      render(<input placeholder="Search members by name..." />)
      
      const input = screen.getByPlaceholderText('Search members by name...')
      expect(input).toBeInTheDocument()
    })
  })

  describe('Helper Text', () => {
    it('displays file upload helper text', () => {
      render(
        <p className="text-gray-500 text-sm">
          Only PDF files up to 10MB are allowed
        </p>
      )
      
      const helper = screen.getByText('Only PDF files up to 10MB are allowed')
      expect(helper).toHaveClass('text-gray-500', 'text-sm')
    })

    it('displays member count', () => {
      render(
        <span className="text-gray-600 text-sm">
          3 members
        </span>
      )
      
      const count = screen.getByText('3 members')
      expect(count).toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('displays no data available message', () => {
      render(
        <div className="text-center text-gray-500 py-8">
          No data available.
        </div>
      )
      
      const emptyState = screen.getByText('No data available.')
      expect(emptyState).toHaveClass('text-center', 'text-gray-500')
    })

    it('displays no members found message', () => {
      render(
        <div className="text-center text-gray-500 py-4">
          No members found
        </div>
      )
      
      const emptyState = screen.getByText('No members found')
      expect(emptyState).toBeInTheDocument()
    })

    it('displays no workspace selected message', () => {
      render(
        <div className="text-gray-400 text-sm">
          No workspace selected
        </div>
      )
      
      const message = screen.getByText('No workspace selected')
      expect(message).toHaveClass('text-gray-400', 'text-sm')
    })
  })

  describe('Loading States', () => {
    it('displays loading members text', () => {
      render(
        <div className="text-gray-500 text-sm">
          Loading members...
        </div>
      )
      
      const loading = screen.getByText('Loading members...')
      expect(loading).toHaveClass('text-gray-500', 'text-sm')
    })

    it('displays uploading file status', () => {
      render(
        <div className="text-blue-600 text-sm">
          Uploading file...
        </div>
      )
      
      const uploading = screen.getByText('Uploading file...')
      expect(uploading).toHaveClass('text-blue-600', 'text-sm')
    })
  })
})
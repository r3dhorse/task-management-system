import React from 'react'
import { render, screen, userEvent } from '@/test-utils'

// Mock form components
interface MockFormFieldProps {
  label: string
  required?: boolean
  error?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const MockFormField = ({ 
  label, 
  required = false, 
  error, 
  type = 'text',
  placeholder,
  disabled = false,
  value,
  onChange 
}: MockFormFieldProps) => (
  <div className="space-y-2">
    <label className="text-sm font-medium">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      value={value}
      onChange={onChange}
      className={`w-full px-3 py-2 border rounded-md ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    />
    {error && (
      <span className="text-red-500 text-sm" role="alert">
        {error}
      </span>
    )}
  </div>
)

interface MockSelectFieldProps {
  label: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
  disabled?: boolean
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  error?: string
}

const MockSelectField = ({ 
  label, 
  options, 
  placeholder, 
  disabled = false,
  value,
  onChange,
  error 
}: MockSelectFieldProps) => (
  <div className="space-y-2">
    <label className="text-sm font-medium">{label}</label>
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full px-3 py-2 border rounded-md ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && (
      <span className="text-red-500 text-sm" role="alert">
        {error}
      </span>
    )}
  </div>
)

interface MockTextAreaFieldProps {
  label: string
  placeholder?: string
  disabled?: boolean
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  error?: string
  rows?: number
}

const MockTextAreaField = ({ 
  label, 
  placeholder, 
  disabled = false,
  value,
  onChange,
  error,
  rows = 3 
}: MockTextAreaFieldProps) => (
  <div className="space-y-2">
    <label className="text-sm font-medium">{label}</label>
    <textarea
      placeholder={placeholder}
      disabled={disabled}
      value={value}
      onChange={onChange}
      rows={rows}
      className={`w-full px-3 py-2 border rounded-md resize-none ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    />
    {error && (
      <span className="text-red-500 text-sm" role="alert">
        {error}
      </span>
    )}
  </div>
)

interface MockFileUploadProps {
  label: string
  accept?: string
  maxSize?: string
  disabled?: boolean
  error?: string
  onFileSelect?: (file: File | null) => void
}

const MockFileUpload = ({ 
  label, 
  accept = '.pdf', 
  maxSize = '10MB',
  disabled = false,
  error,
  onFileSelect 
}: MockFileUploadProps) => {
  const inputId = `file-${label.toLowerCase().replace(/\s+/g, '-')}`
  
  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-medium">{label}</label>
      <input
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => onFileSelect?.(e.target.files?.[0] || null)}
        className={`w-full px-3 py-2 border rounded-md ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      <p className="text-gray-500 text-sm">
        Only PDF files up to {maxSize} are allowed
      </p>
      {error && (
        <span className="text-red-500 text-sm" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

describe('Form Components', () => {
  describe('Text Input Fields', () => {
    it('renders text input with label', () => {
      render(
        <MockFormField 
          label="Task Name" 
          placeholder="Enter task name"
        />
      )

      expect(screen.getByText('Task Name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter task name')).toBeInTheDocument()
    })

    it('renders required field indicator', () => {
      render(
        <MockFormField 
          label="Email Address" 
          required={true}
          type="email"
          placeholder="Enter your email"
        />
      )

      expect(screen.getByText('Email Address')).toBeInTheDocument()
      expect(screen.getByText('*')).toHaveClass('text-red-500')
    })

    it('handles text input changes', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()
      
      render(
        <MockFormField 
          label="Task Name" 
          placeholder="Enter task name"
          onChange={handleChange}
        />
      )

      const input = screen.getByPlaceholderText('Enter task name')
      await user.type(input, 'My new task')

      expect(handleChange).toHaveBeenCalled()
    })

    it('displays validation error', () => {
      render(
        <MockFormField 
          label="Task Name" 
          error="Task name is required"
        />
      )

      const error = screen.getByRole('alert')
      expect(error).toHaveTextContent('Task name is required')
      expect(error).toHaveClass('text-red-500', 'text-sm')
    })

    it('shows disabled state correctly', () => {
      render(
        <MockFormField 
          label="Task Name" 
          disabled={true}
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
      expect(input).toHaveClass('opacity-50', 'cursor-not-allowed')
    })

    it('renders email input type', () => {
      render(
        <MockFormField 
          label="Email" 
          type="email"
          placeholder="Enter your email"
        />
      )

      const input = screen.getByPlaceholderText('Enter your email')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('renders password input type', () => {
      render(
        <MockFormField 
          label="Password" 
          type="password"
          placeholder="Enter your password"
        />
      )

      const input = screen.getByPlaceholderText('Enter your password')
      expect(input).toHaveAttribute('type', 'password')
    })
  })

  describe('Select Dropdown Fields', () => {
    const statusOptions = [
      { value: 'BACKLOG', label: 'Backlog' },
      { value: 'TODO', label: 'Todo' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'IN_REVIEW', label: 'In Review' },
      { value: 'DONE', label: 'Done' },
    ]

    it('renders select dropdown with options', () => {
      render(
        <MockSelectField 
          label="Status" 
          options={statusOptions}
          placeholder="Select status"
        />
      )

      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Select status')).toBeInTheDocument()
      expect(screen.getByText('Backlog')).toBeInTheDocument()
      expect(screen.getByText('Todo')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })

    it('handles select changes', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()
      
      render(
        <MockSelectField 
          label="Status" 
          options={statusOptions}
          onChange={handleChange}
        />
      )

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, 'TODO')

      expect(handleChange).toHaveBeenCalled()
    })

    it('shows disabled select state', () => {
      render(
        <MockSelectField 
          label="Status" 
          options={statusOptions}
          disabled={true}
        />
      )

      const select = screen.getByRole('combobox')
      expect(select).toBeDisabled()
      expect(select).toHaveClass('opacity-50', 'cursor-not-allowed')
    })

    it('displays select validation error', () => {
      render(
        <MockSelectField 
          label="Status" 
          options={statusOptions}
          error="Please select a status"
        />
      )

      const error = screen.getByRole('alert')
      expect(error).toHaveTextContent('Please select a status')
    })

    it('renders assignee select with unassigned option', () => {
      const assigneeOptions = [
        { value: '', label: 'Unassigned' },
        { value: 'user-1', label: 'John Doe' },
        { value: 'user-2', label: 'Jane Smith' },
      ]

      render(
        <MockSelectField 
          label="Assignee" 
          options={assigneeOptions}
          placeholder="Select assignee"
        />
      )

      expect(screen.getByText('Unassigned')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  describe('Textarea Fields', () => {
    it('renders textarea with label', () => {
      render(
        <MockTextAreaField 
          label="Description" 
          placeholder="Enter description"
        />
      )

      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument()
    })

    it('handles textarea changes', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()
      
      render(
        <MockTextAreaField 
          label="Description" 
          onChange={handleChange}
        />
      )

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'This is a description')

      expect(handleChange).toHaveBeenCalled()
    })

    it('sets correct rows attribute', () => {
      render(
        <MockTextAreaField 
          label="Description" 
          rows={5}
        />
      )

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('rows', '5')
    })

    it('shows disabled textarea state', () => {
      render(
        <MockTextAreaField 
          label="Description" 
          disabled={true}
        />
      )

      const textarea = screen.getByRole('textbox')
      expect(textarea).toBeDisabled()
      expect(textarea).toHaveClass('opacity-50', 'cursor-not-allowed')
    })
  })

  describe('File Upload Fields', () => {
    it('renders file upload with label and helper text', () => {
      render(
        <MockFileUpload 
          label="Attachment" 
        />
      )

      expect(screen.getByText('Attachment')).toBeInTheDocument()
      expect(screen.getByText('Only PDF files up to 10MB are allowed')).toBeInTheDocument()
    })


    it('displays file upload error', () => {
      render(
        <MockFileUpload 
          label="Attachment" 
          error="File size exceeds 10MB limit"
        />
      )

      const error = screen.getByRole('alert')
      expect(error).toHaveTextContent('File size exceeds 10MB limit')
    })

  })

  describe('Form Validation Messages', () => {
    it('displays email format validation error', () => {
      render(
        <MockFormField 
          label="Email" 
          type="email"
          error="Invalid email format"
        />
      )

      expect(screen.getByText('Invalid email format')).toBeInTheDocument()
    })

    it('displays password length validation error', () => {
      render(
        <MockFormField 
          label="Password" 
          type="password"
          error="Password must be at least 8 characters"
        />
      )

      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    })

    it('displays required field validation error', () => {
      render(
        <MockFormField 
          label="Task Name" 
          error="Task name is required"
        />
      )

      expect(screen.getByText('Task name is required')).toBeInTheDocument()
    })

    it('displays workspace name validation error', () => {
      render(
        <MockFormField 
          label="Workspace Name" 
          error="Workspace name must be at least 3 characters"
        />
      )

      expect(screen.getByText('Workspace name must be at least 3 characters')).toBeInTheDocument()
    })

    it('displays due date validation error', () => {
      render(
        <MockFormField 
          label="Due Date" 
          type="date"
          error="Due date cannot be in the past"
        />
      )

      expect(screen.getByText('Due date cannot be in the past')).toBeInTheDocument()
    })
  })

  describe('Search Input', () => {
    it('renders search input with placeholder', () => {
      render(
        <MockFormField 
          label="Search Members" 
          placeholder="Search members by name..."
          type="search"
        />
      )

      const searchInput = screen.getByPlaceholderText('Search members by name...')
      expect(searchInput).toHaveAttribute('type', 'search')
    })

    it('handles search input changes', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()
      
      render(
        <MockFormField 
          label="Search" 
          placeholder="Search tasks..."
          onChange={handleChange}
        />
      )

      const searchInput = screen.getByPlaceholderText('Search tasks...')
      await user.type(searchInput, 'task name')

      expect(handleChange).toHaveBeenCalled()
    })
  })
})
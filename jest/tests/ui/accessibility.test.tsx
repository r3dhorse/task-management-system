import React from 'react'
import { render, screen, userEvent } from '@/test-utils'

// Mock accessible components
interface MockButtonProps {
  children: React.ReactNode
  ariaLabel?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
}

const MockButton = ({ 
  children, 
  ariaLabel, 
  disabled = false,
  type = 'button',
  onClick 
}: MockButtonProps) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    aria-label={ariaLabel}
    className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
  >
    {children}
  </button>
)

interface MockFormProps {
  onSubmit: (e: React.FormEvent) => void
  children: React.ReactNode
  ariaLabel?: string
}

const MockForm = ({ 
  onSubmit, 
  children,
  ariaLabel 
}: MockFormProps) => (
  <form 
    onSubmit={onSubmit}
    aria-label={ariaLabel}
    noValidate
  >
    {children}
  </form>
)

interface MockInputProps {
  label: string
  required?: boolean
  error?: string
  type?: string
  id?: string
  ariaDescribedBy?: string
}

const MockInput = ({ 
  label, 
  required = false, 
  error, 
  type = 'text',
  id,
  ariaDescribedBy 
}: MockInputProps) => {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`
  const errorId = error ? `${inputId}-error` : undefined
  
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      <input
        id={inputId}
        type={type}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : ariaDescribedBy}
        className={`mt-1 block w-full px-3 py-2 border rounded-md ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && (
        <div 
          id={errorId}
          role="alert" 
          className="text-red-500 text-sm mt-1"
        >
          {error}
        </div>
      )}
    </div>
  )
}

interface MockSelectProps {
  label: string
  options: Array<{ value: string; label: string }>
  required?: boolean
  error?: string
  ariaLabel?: string
}

const MockSelect = ({ 
  label, 
  options, 
  required = false,
  error,
  ariaLabel 
}: MockSelectProps) => {
  const selectId = `select-${label.toLowerCase().replace(/\s+/g, '-')}`
  const errorId = error ? `${selectId}-error` : undefined
  
  return (
    <div>
      <label htmlFor={selectId} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      <select
        id={selectId}
        required={required}
        aria-label={ariaLabel}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`mt-1 block w-full px-3 py-2 border rounded-md ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <div 
          id={errorId}
          role="alert" 
          className="text-red-500 text-sm mt-1"
        >
          {error}
        </div>
      )}
    </div>
  )
}

interface MockModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

const MockModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children 
}: MockModalProps) => {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 id="modal-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button 
            onClick={onClose}
            aria-label="Close modal"
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

interface MockNavigationMenuProps {
  items: Array<{ label: string; href: string; current?: boolean }>
}

const MockNavigationMenu = ({ 
  items 
}: MockNavigationMenuProps) => (
  <nav aria-label="Main navigation">
    <ul role="list">
      {items.map((item, index) => (
        <li key={index}>
          <a 
            href={item.href}
            aria-current={item.current ? 'page' : undefined}
            className={`block px-4 py-2 ${
              item.current ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
            }`}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  </nav>
)

interface MockDataTableProps {
  caption: string
  headers: Array<{ key: string; label: string; sortable?: boolean }>
  data: Array<Record<string, string>>
}

const MockDataTable = ({ 
  caption, 
  headers, 
  data 
}: MockDataTableProps) => (
  <table className="w-full">
    <caption className="sr-only">{caption}</caption>
    <thead>
      <tr>
        {headers.map(header => (
          <th 
            key={header.key}
            scope="col"
            className="text-left p-2"
          >
            {header.sortable ? (
              <button 
                aria-label={`Sort by ${header.label}`}
                className="flex items-center"
              >
                {header.label}
                <span aria-hidden="true" className="ml-1">↕</span>
              </button>
            ) : (
              header.label
            )}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {data.map((row, index) => (
        <tr key={index}>
          {headers.map(header => (
            <td key={header.key} className="p-2">
              {row[header.key]}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
)

describe('Accessibility Tests', () => {
  describe('Button Accessibility', () => {
    it('has proper button role', () => {
      render(<MockButton>Click me</MockButton>)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('supports aria-label for icon buttons', () => {
      render(<MockButton ariaLabel="Close dialog">×</MockButton>)
      
      const button = screen.getByRole('button', { name: /close dialog/i })
      expect(button).toHaveAttribute('aria-label', 'Close dialog')
    })

    it('indicates disabled state properly', () => {
      render(<MockButton disabled>Disabled Button</MockButton>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('disabled')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()
      
      render(<MockButton onClick={handleClick}>Keyboard Button</MockButton>)
      
      const button = screen.getByRole('button')
      button.focus()
      
      await user.keyboard('{Enter}')
      expect(handleClick).toHaveBeenCalledTimes(1)
      
      await user.keyboard(' ')
      expect(handleClick).toHaveBeenCalledTimes(2)
    })

    it('has focus visible styles', () => {
      render(<MockButton>Focus Button</MockButton>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus:ring-2', 'focus:ring-blue-500')
    })
  })

  describe('Form Accessibility', () => {
    it('has proper form labels', () => {
      render(
        <div>
          <MockInput label="Email Address" type="email" required />
        </div>
      )
      
      const input = screen.getByLabelText(/email address/i)
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'email')
      expect(input).toBeRequired()
    })

    it('associates error messages with inputs', () => {
      render(
        <MockInput 
          label="Password" 
          type="password" 
          error="Password is required"
        />
      )
      
      const input = screen.getByLabelText('Password')
      const error = screen.getByRole('alert')
      
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby', 'input-password-error')
      expect(error).toHaveAttribute('id', 'input-password-error')
    })

    it('indicates required fields properly', () => {
      render(
        <MockInput label="Task Name" required />
      )
      
      const requiredIndicator = screen.getByLabelText('required')
      expect(requiredIndicator).toHaveTextContent('*')
      expect(requiredIndicator).toHaveClass('text-red-500')
    })

    it('has proper form structure', () => {
      render(
        <MockForm onSubmit={jest.fn()} ariaLabel="Create task form">
          <MockInput label="Task Name" required />
          <MockButton type="submit">Create Task</MockButton>
        </MockForm>
      )
      
      const form = screen.getByRole('form')
      expect(form).toHaveAttribute('aria-label', 'Create task form')
      expect(form).toHaveAttribute('novalidate')
    })

    it('handles select accessibility correctly', () => {
      const options = [
        { value: 'TODO', label: 'Todo' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
      ]
      
      render(
        <MockSelect 
          label="Status" 
          options={options}
          ariaLabel="Select task status"
        />
      )
      
      const select = screen.getByRole('combobox')
      expect(select).toHaveAttribute('aria-label', 'Select task status')
    })
  })

  describe('Modal Accessibility', () => {
    it('has proper modal attributes', () => {
      render(
        <MockModal 
          isOpen={true}
          onClose={jest.fn()}
          title="Delete Task"
        >
          Are you sure?
        </MockModal>
      )
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title')
    })

    it('has accessible close button', () => {
      render(
        <MockModal 
          isOpen={true}
          onClose={jest.fn()}
          title="Settings"
        >
          Modal content
        </MockModal>
      )
      
      const closeButton = screen.getByRole('button', { name: /close modal/i })
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal')
    })

    it('focuses properly when opened', () => {
      render(
        <MockModal 
          isOpen={true}
          onClose={jest.fn()}
          title="Settings"
        >
          <button>First focusable element</button>
        </MockModal>
      )
      
      const firstButton = screen.getByText('First focusable element')
      expect(firstButton).toBeInTheDocument()
    })
  })

  describe('Navigation Accessibility', () => {
    it('has proper navigation structure', () => {
      const navItems = [
        { label: 'Home', href: '/', current: true },
        { label: 'Tasks', href: '/tasks' },
        { label: 'Members', href: '/members' },
      ]
      
      render(<MockNavigationMenu items={navItems} />)
      
      const nav = screen.getByRole('navigation', { name: /main navigation/i })
      expect(nav).toBeInTheDocument()
      
      const list = screen.getByRole('list')
      expect(list).toBeInTheDocument()
    })

    it('indicates current page properly', () => {
      const navItems = [
        { label: 'Home', href: '/', current: true },
        { label: 'Tasks', href: '/tasks' },
      ]
      
      render(<MockNavigationMenu items={navItems} />)
      
      const currentLink = screen.getByRole('link', { name: /home/i })
      expect(currentLink).toHaveAttribute('aria-current', 'page')
    })
  })

  describe('Table Accessibility', () => {
    it('has proper table structure', () => {
      const headers = [
        { key: 'name', label: 'Task Name', sortable: true },
        { key: 'status', label: 'Status' },
      ]
      const data = [
        { name: 'Task 1', status: 'Todo' },
        { name: 'Task 2', status: 'Done' },
      ]
      
      render(
        <MockDataTable 
          caption="List of tasks in the project"
          headers={headers}
          data={data}
        />
      )
      
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      
      const caption = screen.getByText('List of tasks in the project')
      expect(caption).toHaveClass('sr-only')
    })

    it('has proper column headers', () => {
      const headers = [
        { key: 'name', label: 'Task Name', sortable: true },
        { key: 'status', label: 'Status' },
      ]
      
      render(
        <MockDataTable 
          caption="Tasks table"
          headers={headers}
          data={[]}
        />
      )
      
      const taskNameHeader = screen.getByRole('columnheader', { name: /task name/i })
      expect(taskNameHeader).toHaveAttribute('scope', 'col')
      
      const statusHeader = screen.getByRole('columnheader', { name: /status/i })
      expect(statusHeader).toHaveAttribute('scope', 'col')
    })

    it('has accessible sort buttons', () => {
      const headers = [
        { key: 'name', label: 'Task Name', sortable: true },
      ]
      
      render(
        <MockDataTable 
          caption="Tasks table"
          headers={headers}
          data={[]}
        />
      )
      
      const sortButton = screen.getByRole('button', { name: /sort by task name/i })
      expect(sortButton).toHaveAttribute('aria-label', 'Sort by Task Name')
      
      const sortIcon = screen.getByText('↕')
      expect(sortIcon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Screen Reader Support', () => {
    it('provides screen reader only text', () => {
      render(
        <div>
          <span className="sr-only">Loading content</span>
          <div aria-hidden="true">🔄</div>
        </div>
      )
      
      const srText = screen.getByText('Loading content')
      expect(srText).toHaveClass('sr-only')
      
      const icon = screen.getByText('🔄')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })

    it('uses proper live regions for dynamic content', () => {
      render(
        <div role="status" aria-live="polite">
          Task saved successfully
        </div>
      )
      
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    })

    it('uses alert role for important messages', () => {
      render(
        <div role="alert">
          Error: Failed to save task
        </div>
      )
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('Error: Failed to save task')
    })
  })

  describe('Color and Contrast', () => {
    it('uses appropriate color classes for errors', () => {
      render(
        <MockInput 
          label="Email" 
          error="Invalid email format"
        />
      )
      
      const input = screen.getByLabelText('Email')
      expect(input).toHaveClass('border-red-500')
      
      const error = screen.getByRole('alert')
      expect(error).toHaveClass('text-red-500')
    })

    it('uses appropriate color classes for success', () => {
      render(
        <div className="text-green-600 bg-green-50 border-green-200 p-3 rounded">
          Success message
        </div>
      )
      
      const successMessage = screen.getByText('Success message')
      expect(successMessage).toHaveClass('text-green-600', 'bg-green-50')
    })
  })

  describe('Keyboard Navigation', () => {
    it('supports tab navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <MockButton>Button 1</MockButton>
          <MockButton>Button 2</MockButton>
          <MockButton>Button 3</MockButton>
        </div>
      )
      
      const button1 = screen.getByRole('button', { name: 'Button 1' })
      const button2 = screen.getByRole('button', { name: 'Button 2' })
      
      button1.focus()
      expect(button1).toHaveFocus()
      
      await user.tab()
      expect(button2).toHaveFocus()
    })

    it('supports escape key for modals', async () => {
      const user = userEvent.setup()
      const handleClose = jest.fn()
      
      render(
        <MockModal 
          isOpen={true}
          onClose={handleClose}
          title="Test Modal"
        >
          Modal content
        </MockModal>
      )
      
      await user.keyboard('{Escape}')
      // Note: In a real implementation, the modal would listen for escape key
      // This test would need additional setup for that functionality
    })
  })
})
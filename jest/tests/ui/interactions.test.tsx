import React from 'react'
import { render, screen, userEvent, fireEvent } from '@/test-utils'

// Mock interactive components
interface MockModalDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
}

const MockModalDialog = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm 
}: MockModalDialogProps) => {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 id="modal-title" className="text-lg font-semibold mb-4">
          {title}
        </h2>
        <div className="mb-6">
          {children}
        </div>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

interface MockDropdownMenuProps {
  trigger: React.ReactNode
  items: Array<{ label: string; onClick: () => void; variant?: 'default' | 'destructive' }>
  isOpen: boolean
  onToggle: () => void
}

const MockDropdownMenu = ({ 
  trigger, 
  items,
  isOpen,
  onToggle 
}: MockDropdownMenuProps) => (
  <div className="relative">
    <button onClick={onToggle} aria-expanded={isOpen}>
      {trigger}
    </button>
    {isOpen && (
      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${
              item.variant === 'destructive' ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    )}
  </div>
)

interface MockDraggableCardProps {
  id: string
  children: React.ReactNode
  onDragStart?: (id: string) => void
  onDragEnd?: () => void
}

const MockDraggableCard = ({ 
  id, 
  children, 
  onDragStart, 
  onDragEnd 
}: MockDraggableCardProps) => (
  <div
    draggable
    data-task-id={id}
    onDragStart={() => onDragStart?.(id)}
    onDragEnd={onDragEnd}
    className="p-4 bg-white border border-gray-200 rounded-lg cursor-move hover:shadow-md"
  >
    {children}
  </div>
)

interface MockDropZoneProps {
  onDrop: (taskId: string, newStatus: string) => void
  status: string
  children: React.ReactNode
}

const MockDropZone = ({ 
  onDrop, 
  status, 
  children 
}: MockDropZoneProps) => (
  <div
    data-status={status}
    onDrop={(e) => {
      e.preventDefault()
      const taskId = e.dataTransfer.getData('text/plain')
      onDrop(taskId, status)
    }}
    onDragOver={(e) => e.preventDefault()}
    className="min-h-48 p-4 border-2 border-dashed border-gray-200 rounded-lg"
  >
    <h3 className="font-semibold mb-4">{children}</h3>
  </div>
)

interface MockDataTableProps {
  data: Array<{ id: string; name: string; status: string }>
  onRowDoubleClick?: (id: string) => void
  onSort?: (column: string) => void
}

const MockDataTable = ({ 
  data, 
  onRowDoubleClick,
  onSort 
}: MockDataTableProps) => (
  <table className="w-full">
    <thead>
      <tr>
        <th>
          <button onClick={() => onSort?.('name')} className="flex items-center">
            Name
            <span className="ml-1">↕</span>
          </button>
        </th>
        <th>
          <button onClick={() => onSort?.('status')} className="flex items-center">
            Status
            <span className="ml-1">↕</span>
          </button>
        </th>
      </tr>
    </thead>
    <tbody>
      {data.map(row => (
        <tr 
          key={row.id}
          onDoubleClick={() => onRowDoubleClick?.(row.id)}
          className="hover:bg-gray-50 cursor-pointer"
        >
          <td className="p-2">{row.name}</td>
          <td className="p-2">{row.status}</td>
        </tr>
      ))}
    </tbody>
  </table>
)

describe('Interactive UI Components', () => {
  describe('Modal Dialogs', () => {
    it('renders modal when open', () => {
      render(
        <MockModalDialog 
          isOpen={true}
          onClose={jest.fn()}
          title="Delete Task"
        >
          Are you sure you want to delete this task?
        </MockModalDialog>
      )

      const modal = screen.getByRole('dialog')
      expect(modal).toBeInTheDocument()
      expect(modal).toHaveAttribute('aria-modal', 'true')
      expect(screen.getByText('Delete Task')).toBeInTheDocument()
    })

    it('does not render modal when closed', () => {
      render(
        <MockModalDialog 
          isOpen={false}
          onClose={jest.fn()}
          title="Delete Task"
        >
          Are you sure you want to delete this task?
        </MockModalDialog>
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('handles modal close action', async () => {
      const user = userEvent.setup()
      const handleClose = jest.fn()

      render(
        <MockModalDialog 
          isOpen={true}
          onClose={handleClose}
          title="Delete Task"
        >
          Are you sure you want to delete this task?
        </MockModalDialog>
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('handles modal confirm action', async () => {
      const user = userEvent.setup()
      const handleConfirm = jest.fn()

      render(
        <MockModalDialog 
          isOpen={true}
          onClose={jest.fn()}
          title="Delete Task"
          onConfirm={handleConfirm}
        >
          Are you sure you want to delete this task?
        </MockModalDialog>
      )

      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)

      expect(handleConfirm).toHaveBeenCalledTimes(1)
    })

    it('displays custom button text', () => {
      render(
        <MockModalDialog 
          isOpen={true}
          onClose={jest.fn()}
          title="Remove Member"
          confirmText="Remove"
          cancelText="Keep"
        >
          Remove this member from the workspace?
        </MockModalDialog>
      )

      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /keep/i })).toBeInTheDocument()
    })

    it('has proper accessibility attributes', () => {
      render(
        <MockModalDialog 
          isOpen={true}
          onClose={jest.fn()}
          title="Delete Task"
        >
          Are you sure?
        </MockModalDialog>
      )

      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title')
      expect(screen.getByText('Delete Task')).toHaveAttribute('id', 'modal-title')
    })
  })

  describe('Dropdown Menus', () => {
    it('shows dropdown when triggered', async () => {
      const user = userEvent.setup()
      
      const TestDropdown = () => {
        const [isOpen, setIsOpen] = React.useState(false)
        
        return (
          <MockDropdownMenu 
            trigger={<span>⋮</span>}
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            items={[
              { label: 'Edit', onClick: jest.fn() },
              { label: 'Delete', onClick: jest.fn(), variant: 'destructive' },
            ]}
          />
        )
      }

      render(<TestDropdown />)

      const trigger = screen.getByRole('button')
      await user.click(trigger)

      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('handles dropdown item clicks', async () => {
      const user = userEvent.setup()
      const handleEdit = jest.fn()
      const handleDelete = jest.fn()

      render(
        <MockDropdownMenu 
          trigger={<span>Actions</span>}
          isOpen={true}
          onToggle={jest.fn()}
          items={[
            { label: 'Edit Task', onClick: handleEdit },
            { label: 'Delete Task', onClick: handleDelete, variant: 'destructive' },
          ]}
        />
      )

      await user.click(screen.getByText('Edit Task'))
      expect(handleEdit).toHaveBeenCalledTimes(1)

      await user.click(screen.getByText('Delete Task'))
      expect(handleDelete).toHaveBeenCalledTimes(1)
    })

    it('styles destructive items correctly', () => {
      render(
        <MockDropdownMenu 
          trigger={<span>Actions</span>}
          isOpen={true}
          onToggle={jest.fn()}
          items={[
            { label: 'Edit', onClick: jest.fn() },
            { label: 'Delete', onClick: jest.fn(), variant: 'destructive' },
          ]}
        />
      )

      const deleteButton = screen.getByText('Delete')
      expect(deleteButton).toHaveClass('text-red-600')
    })

    it('has proper ARIA attributes', () => {
      render(
        <MockDropdownMenu 
          trigger={<span>Menu</span>}
          isOpen={true}
          onToggle={jest.fn()}
          items={[]}
        />
      )

      const trigger = screen.getByRole('button')
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Drag and Drop', () => {
    it('handles drag start event', () => {
      const handleDragStart = jest.fn()

      render(
        <MockDraggableCard 
          id="task-1"
          onDragStart={handleDragStart}
        >
          Task Card
        </MockDraggableCard>
      )

      const card = screen.getByText('Task Card')
      fireEvent.dragStart(card)

      expect(handleDragStart).toHaveBeenCalledWith('task-1')
    })

    it('handles drag end event', () => {
      const handleDragEnd = jest.fn()

      render(
        <MockDraggableCard 
          id="task-1"
          onDragEnd={handleDragEnd}
        >
          Task Card
        </MockDraggableCard>
      )

      const card = screen.getByText('Task Card')
      fireEvent.dragEnd(card)

      expect(handleDragEnd).toHaveBeenCalledTimes(1)
    })

    it('handles drop event', () => {
      const handleDrop = jest.fn()

      render(
        <MockDropZone 
          onDrop={handleDrop}
          status="IN_PROGRESS"
        >
          In Progress
        </MockDropZone>
      )

      const dropZone = screen.getByText('In Progress').parentElement!
      
      // Mock dataTransfer
      const dropEvent = new Event('drop', { bubbles: true })
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: jest.fn().mockReturnValue('task-1'),
        },
      })

      fireEvent(dropZone, dropEvent)

      expect(handleDrop).toHaveBeenCalledWith('task-1', 'IN_PROGRESS')
    })

    it('prevents default on drag over', () => {
      render(
        <MockDropZone 
          onDrop={jest.fn()}
          status="DONE"
        >
          Done
        </MockDropZone>
      )

      const dropZone = screen.getByText('Done').parentElement!
      const dragOverEvent = new Event('dragover', { bubbles: true })
      const preventDefaultSpy = jest.spyOn(dragOverEvent, 'preventDefault')

      fireEvent(dropZone, dragOverEvent)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('Data Table Interactions', () => {
    const mockData = [
      { id: '1', name: 'Task 1', status: 'TODO' },
      { id: '2', name: 'Task 2', status: 'IN_PROGRESS' },
    ]

    it('handles row double-click', async () => {
      const user = userEvent.setup()
      const handleRowDoubleClick = jest.fn()

      render(
        <MockDataTable 
          data={mockData}
          onRowDoubleClick={handleRowDoubleClick}
        />
      )

      const firstRow = screen.getByText('Task 1').closest('tr')!
      await user.dblClick(firstRow)

      expect(handleRowDoubleClick).toHaveBeenCalledWith('1')
    })

    it('handles column sorting', async () => {
      const user = userEvent.setup()
      const handleSort = jest.fn()

      render(
        <MockDataTable 
          data={mockData}
          onSort={handleSort}
        />
      )

      const nameHeader = screen.getByRole('button', { name: /name/i })
      await user.click(nameHeader)

      expect(handleSort).toHaveBeenCalledWith('name')
    })

    it('shows hover effects on rows', () => {
      render(
        <MockDataTable 
          data={mockData}
        />
      )

      const firstRow = screen.getByText('Task 1').closest('tr')!
      expect(firstRow).toHaveClass('hover:bg-gray-50', 'cursor-pointer')
    })

    it('displays sort indicators', () => {
      render(
        <MockDataTable 
          data={mockData}
        />
      )

      expect(screen.getAllByText('↕')).toHaveLength(2)
    })
  })

  describe('Button Hover and Focus States', () => {
    it('applies hover classes to buttons', () => {
      render(
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          Hover Button
        </button>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-blue-700')
    })

    it('applies focus classes to buttons', async () => {
      const user = userEvent.setup()
      
      render(
        <button className="focus:ring-2 focus:ring-blue-500 px-4 py-2">
          Focus Button
        </button>
      )

      const button = screen.getByRole('button')
      await user.tab()

      expect(button).toHaveClass('focus:ring-2', 'focus:ring-blue-500')
    })

    it('handles keyboard navigation', async () => {
      const user = userEvent.setup()
      const handleClick = jest.fn()

      render(
        <button onClick={handleClick}>
          Keyboard Button
        </button>
      )

      const button = screen.getByRole('button')
      button.focus()

      await user.keyboard('{Enter}')
      expect(handleClick).toHaveBeenCalledTimes(1)

      await user.keyboard(' ')
      expect(handleClick).toHaveBeenCalledTimes(2)
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner in button', () => {
      render(
        <button disabled className="flex items-center">
          <span className="animate-spin mr-2">⟳</span>
          Loading...
        </button>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByText('⟳')).toHaveClass('animate-spin')
    })

    it('disables interactions during loading', () => {
      render(
        <button disabled>
          Creating...
        </button>
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })
})
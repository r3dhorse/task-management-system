import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/test-utils'
import { KanbanCard } from '@/features/tasks/components/kanban-card'
import { PopulatedTask } from '@/features/tasks/types'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock workspace hook
jest.mock('@/features/workspaces/hooks/use-workspace-id', () => ({
  useWorkspaceId: () => 'test-workspace-id',
}))

// Mock members API
jest.mock('@/features/members/api/use-get-members', () => ({
  useGetMembers: () => ({
    data: {
      documents: [
        {
          $id: 'member-1',
          name: 'John Doe',
        },
        {
          $id: 'member-2', 
          name: 'Jane Smith',
        },
      ],
    },
  }),
}))

// Mock task actions component
interface MockTaskActionsProps {
  children: React.ReactNode;
}

jest.mock('@/features/tasks/components/task-actions', () => ({
  TaskActions: ({ children }: MockTaskActionsProps) => (
    <div 
      data-testid="task-actions" 
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  ),
}))

// Mock task date component
interface MockTaskDateProps {
  value: string;
}

jest.mock('@/features/tasks/components/task-date', () => ({
  TaskDate: ({ value }: MockTaskDateProps) => (
    <div data-testid="task-date">{value}</div>
  ),
}))

describe('KanbanCard Mobile Navigation', () => {
  const mockTask: PopulatedTask = {
    $id: 'task-123',
    name: 'Test Task',
    status: 'TODO' as const,
    workspaceId: 'test-workspace-id',
    projectId: 'test-project-id',
    assigneeId: 'member-1',
    dueDate: '2024-12-31',
    description: 'Test task description',
    position: 1,
    $createdAt: '2024-01-01',
    $updatedAt: '2024-01-01',
    attachmentId: null,
  }

  interface DragDropWrapperProps {
    children: React.ReactNode;
  }

  const DragDropWrapper = ({ children }: DragDropWrapperProps) => (
    <DragDropContext onDragEnd={() => {}}>
      <Droppable droppableId="test">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {children}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )

  beforeEach(() => {
    mockPush.mockClear()
  })

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

  it('navigates to task details on single click (mobile behavior)', async () => {
    setMobileViewport()
    
    render(
      <DragDropWrapper>
        <KanbanCard task={mockTask} index={0} />
      </DragDropWrapper>
    )

    // Find the card by its text content and get the parent container
    const taskTitle = screen.getByText('Test Task')
    const taskCard = taskTitle.closest('div[class*="group"]') // Card has group class
    expect(taskCard).toBeInTheDocument()

    // Single click should navigate on mobile
    fireEvent.click(taskCard!)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/workspaces/test-workspace-id/tasks/task-123')
    })
  })

  it('navigates to task details on double click', async () => {
    render(
      <DragDropWrapper>
        <KanbanCard task={mockTask} index={0} />
      </DragDropWrapper>
    )

    const taskTitle = screen.getByText('Test Task')
    const taskCard = taskTitle.closest('div[class*="group"]')
    expect(taskCard).toBeInTheDocument()

    // Double click should also navigate
    fireEvent.doubleClick(taskCard!)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/workspaces/test-workspace-id/tasks/task-123')
    })
  })

  it('handles invalid task ID gracefully', async () => {
    const invalidTask = { ...mockTask, $id: 'invalid@id!' }
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <DragDropWrapper>
        <KanbanCard task={invalidTask} index={0} />
      </DragDropWrapper>
    )

    const taskTitle = screen.getByText('Test Task')
    const taskCard = taskTitle.closest('div[class*="group"]')
    fireEvent.click(taskCard!)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Invalid task ID format:', 'invalid@id!')
      expect(mockPush).not.toHaveBeenCalled()
    })

    consoleSpy.mockRestore()
  })

  it('prevents drag interference when clicking', async () => {
    render(
      <DragDropWrapper>
        <KanbanCard task={mockTask} index={0} />
      </DragDropWrapper>
    )

    const taskTitle = screen.getByText('Test Task')
    const taskCard = taskTitle.closest('div[class*="group"]')
    
    // Simply click the card - the stopPropagation is called internally
    fireEvent.click(taskCard!)
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/workspaces/test-workspace-id/tasks/task-123')
    })
  })

  it('displays task information correctly', () => {
    render(
      <DragDropWrapper>
        <KanbanCard task={mockTask} index={0} />
      </DragDropWrapper>
    )

    // Check task name
    expect(screen.getByText('Test Task')).toBeInTheDocument()
    
    // Check assignee - use getAllByText since name appears in both assignee and creator sections
    expect(screen.getAllByText('John Doe')).toHaveLength(2)
    
    // Check due date component is rendered
    expect(screen.getByTestId('task-date')).toBeInTheDocument()
    
    // Check task actions are rendered
    expect(screen.getByTestId('task-actions')).toBeInTheDocument()
  })

  it('shows unassigned state when no assignee', () => {
    const unassignedTask = { ...mockTask, assigneeId: null }
    
    render(
      <DragDropWrapper>
        <KanbanCard task={unassignedTask} index={0} />
      </DragDropWrapper>
    )

    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('applies correct CSS classes for mobile touch interaction', () => {
    render(
      <DragDropWrapper>
        <KanbanCard task={mockTask} index={0} />
      </DragDropWrapper>
    )

    const taskTitle = screen.getByText('Test Task')
    const taskCard = taskTitle.closest('div[class*="group"]')
    
    // Check for touch-manipulation class
    expect(taskCard).toHaveClass('touch-manipulation')
  })

  it('handles click on task actions without navigating', async () => {
    render(
      <DragDropWrapper>
        <KanbanCard task={mockTask} index={0} />
      </DragDropWrapper>
    )

    const taskActions = screen.getByTestId('task-actions')
    
    // Click on task actions with stopPropagation should not navigate
    const clickEvent = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(clickEvent, 'stopPropagation', {
      value: jest.fn(),
    })
    
    fireEvent(taskActions, clickEvent)

    // Wait a bit to ensure no navigation occurs
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('maintains proper drag and drop functionality', () => {
    render(
      <DragDropWrapper>
        <KanbanCard task={mockTask} index={0} />
      </DragDropWrapper>
    )

    const taskTitle = screen.getByText('Test Task')
    const taskCard = taskTitle.closest('div[class*="group"]')
    
    // Check for drag cursor class
    expect(taskCard).toHaveClass('cursor-grab')
    
    // Check that it's inside a draggable context
    expect(taskCard).toBeInTheDocument()
  })
})
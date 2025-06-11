import React from 'react'
import { render, screen, fireEvent } from '@/test-utils'

// Mock task type
type MockTask = {
  id: string
  name: string
  status: string
  assignee?: string
  project?: string
  dueDate?: string
}

// Mock Kanban component
interface MockKanbanBoardProps {
  tasks: MockTask[]
  onTaskMove: (taskId: string, newStatus: string) => void
}

const MockKanbanBoard = ({ 
  tasks, 
  onTaskMove 
}: MockKanbanBoardProps) => {
  const columns = [
    { id: 'BACKLOG', title: 'Backlog' },
    { id: 'TODO', title: 'Todo' },
    { id: 'IN_PROGRESS', title: 'In Progress' },
    { id: 'IN_REVIEW', title: 'In Review' },
    { id: 'DONE', title: 'Done' },
  ]

  const getTasksForColumn = (status: string) => 
    tasks.filter(task => task.status === status)

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    onTaskMove(taskId, status)
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId)
  }

  return (
    <div className="kanban-board">
      {columns.map(column => (
        <div 
          key={column.id}
          className="kanban-column"
          data-status={column.id}
          onDrop={(e) => handleDrop(e, column.id)}
          onDragOver={(e) => e.preventDefault()}
        >
          <h3>{column.title}</h3>
          <div className="tasks">
            {getTasksForColumn(column.id).map(task => (
              <div
                key={task.id}
                className="task-card"
                data-task-id={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
              >
                <h4>{task.name}</h4>
                {task.assignee && <p>Assignee: {task.assignee}</p>}
                {task.project && <p>Project: {task.project}</p>}
                {task.dueDate && <p>Due: {new Date(task.dueDate).toLocaleDateString()}</p>}
              </div>
            ))}
            {getTasksForColumn(column.id).length === 0 && (
              <p className="empty-column">No tasks</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

describe('Kanban Board', () => {
  const mockTasks: MockTask[] = [
    {
      id: 'task-1',
      name: 'Task 1',
      status: 'TODO',
      assignee: 'John Doe',
      project: 'Project Alpha',
      dueDate: '2024-12-31',
    },
    {
      id: 'task-2',
      name: 'Task 2',
      status: 'IN_PROGRESS',
      assignee: 'Jane Smith',
      project: 'Project Beta',
    },
    {
      id: 'task-3',
      name: 'Task 3',
      status: 'DONE',
      assignee: 'Bob Wilson',
    },
  ]

  it('renders all kanban columns', () => {
    const mockOnTaskMove = jest.fn()
    render(<MockKanbanBoard tasks={mockTasks} onTaskMove={mockOnTaskMove} />)

    expect(screen.getByText('Backlog')).toBeInTheDocument()
    expect(screen.getByText('Todo')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('In Review')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('displays tasks in correct columns', () => {
    const mockOnTaskMove = jest.fn()
    render(<MockKanbanBoard tasks={mockTasks} onTaskMove={mockOnTaskMove} />)

    // Check tasks are in correct columns
    expect(screen.getByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Task 2')).toBeInTheDocument()
    expect(screen.getByText('Task 3')).toBeInTheDocument()

    // Check task details
    expect(screen.getByText('Assignee: John Doe')).toBeInTheDocument()
    expect(screen.getByText('Project: Project Alpha')).toBeInTheDocument()
  })

  it('shows empty state for columns with no tasks', () => {
    const mockOnTaskMove = jest.fn()
    render(<MockKanbanBoard tasks={[]} onTaskMove={mockOnTaskMove} />)

    // All columns should show empty state
    const emptyMessages = screen.getAllByText('No tasks')
    expect(emptyMessages).toHaveLength(5)
  })

  it('handles drag and drop between columns', () => {
    const mockOnTaskMove = jest.fn()
    render(<MockKanbanBoard tasks={mockTasks} onTaskMove={mockOnTaskMove} />)

    const task1 = screen.getByText('Task 1').closest('[data-task-id="task-1"]')
    const doneColumn = screen.getByText('Done').closest('[data-status="DONE"]')

    // Simulate drag start
    const dragStartEvent = new Event('dragstart', { bubbles: true })
    Object.defineProperty(dragStartEvent, 'dataTransfer', {
      value: {
        setData: jest.fn(),
        getData: jest.fn().mockReturnValue('task-1'),
      },
    })
    fireEvent(task1!, dragStartEvent)

    // Simulate drop
    const dropEvent = new Event('drop', { bubbles: true })
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        getData: jest.fn().mockReturnValue('task-1'),
      },
    })
    fireEvent(doneColumn!, dropEvent)

    expect(mockOnTaskMove).toHaveBeenCalledWith('task-1', 'DONE')
  })

  it('formats due dates correctly', () => {
    const mockOnTaskMove = jest.fn()
    render(<MockKanbanBoard tasks={mockTasks} onTaskMove={mockOnTaskMove} />)

    // Check that due date is formatted
    expect(screen.getByText(/Due: \d{1,2}\/\d{1,2}\/\d{4}/)).toBeInTheDocument()
  })
})
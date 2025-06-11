import { render, screen, userEvent } from '@/test-utils'
import React from 'react'

// Mock task form component
interface MockTaskFormProps {
  onSubmit?: (data: any) => void
}

const MockTaskForm = ({ onSubmit }: MockTaskFormProps) => {
  const [taskName, setTaskName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [status, setStatus] = React.useState('TODO')
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskName.trim()) return
    
    onSubmit?.({
      name: taskName,
      description,
      status,
    })
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Task</h2>
      
      <label htmlFor="task-name">Task Name</label>
      <input
        id="task-name"
        type="text"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        placeholder="Enter task name"
        required
      />
      
      <label htmlFor="task-description">Description</label>
      <textarea
        id="task-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Enter task description"
      />
      
      <label htmlFor="task-status">Status</label>
      <select
        id="task-status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="TODO">To Do</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="DONE">Done</option>
      </select>
      
      <button type="submit" disabled={!taskName.trim()}>
        Create Task
      </button>
    </form>
  )
}

// Mock task chat component
interface MockTaskChatProps {
  taskId: string
}

const MockTaskChat = ({ taskId }: MockTaskChatProps) => {
  const [message, setMessage] = React.useState('')
  const [messages, setMessages] = React.useState([
    { id: '1', content: 'Hello team!', author: 'John Doe' },
    { id: '2', content: 'Working on this task', author: 'Jane Smith' },
  ])
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    
    const newMessage = {
      id: Date.now().toString(),
      content: message,
      author: 'Current User'
    }
    
    setMessages([...messages, newMessage])
    setMessage('')
  }
  
  return (
    <div>
      <h3>Task Chat</h3>
      <div data-testid="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} data-testid="chat-message">
            <strong>{msg.author}:</strong> {msg.content}
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit" disabled={!message.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}

describe('Task Management', () => {
  describe('Task Creation', () => {
    it('renders task creation form', () => {
      render(<MockTaskForm />)
      
      expect(screen.getByRole('heading', { name: 'Create Task' })).toBeInTheDocument()
      expect(screen.getByLabelText('Task Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Status')).toBeInTheDocument()
    })

    it('submits task with correct data', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = jest.fn()
      
      render(<MockTaskForm onSubmit={mockOnSubmit} />)
      
      await user.type(screen.getByLabelText('Task Name'), 'New Task')
      await user.type(screen.getByLabelText('Description'), 'Task description')
      await user.selectOptions(screen.getByLabelText('Status'), 'IN_PROGRESS')
      await user.click(screen.getByRole('button', { name: /create task/i }))
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'New Task',
        description: 'Task description',
        status: 'IN_PROGRESS',
      })
    })

    it('validates required task name', async () => {
      const user = userEvent.setup()
      render(<MockTaskForm />)
      
      const submitButton = screen.getByRole('button', { name: /create task/i })
      expect(submitButton).toBeDisabled()
      
      await user.type(screen.getByLabelText('Task Name'), 'Valid Task Name')
      expect(submitButton).not.toBeDisabled()
    })

    it('allows changing task status', async () => {
      const user = userEvent.setup()
      render(<MockTaskForm />)
      
      const statusSelect = screen.getByLabelText('Status')
      expect(statusSelect).toHaveValue('TODO')
      
      await user.selectOptions(statusSelect, 'DONE')
      expect(statusSelect).toHaveValue('DONE')
    })
  })

  describe('Task Chat', () => {
    it('displays existing messages', () => {
      render(<MockTaskChat taskId="task-123" />)
      
      expect(screen.getByText('Task Chat')).toBeInTheDocument()
      expect(screen.getByText('Hello team!')).toBeInTheDocument()
      expect(screen.getByText('Working on this task')).toBeInTheDocument()
    })

    it('sends new messages', async () => {
      const user = userEvent.setup()
      render(<MockTaskChat taskId="task-123" />)
      
      const messageInput = screen.getByPlaceholderText('Type a message...')
      const sendButton = screen.getByRole('button', { name: /send/i })
      
      await user.type(messageInput, 'New message')
      await user.click(sendButton)
      
      expect(screen.getByText('New message')).toBeInTheDocument()
      expect(messageInput).toHaveValue('')
    })

    it('prevents sending empty messages', async () => {
      const user = userEvent.setup()
      render(<MockTaskChat taskId="task-123" />)
      
      const sendButton = screen.getByRole('button', { name: /send/i })
      expect(sendButton).toBeDisabled()
      
      await user.type(screen.getByPlaceholderText('Type a message...'), 'Valid message')
      expect(sendButton).not.toBeDisabled()
    })

    it('displays message authors', () => {
      render(<MockTaskChat taskId="task-123" />)
      
      expect(screen.getByText('John Doe:')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith:')).toBeInTheDocument()
    })
  })
})
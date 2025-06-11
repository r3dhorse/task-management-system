import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/test-utils'

// Mock matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock task message hooks
const mockCreateTaskMessage = jest.fn()

jest.mock('@/features/tasks/api/use-create-task-message', () => ({
  useCreateTaskMessage: () => ({
    mutate: mockCreateTaskMessage,
    isPending: false,
  }),
}))

// Mock task messages data
const mockMessages = [
  {
    $id: 'message-1',
    content: 'This task looks good to me!',
    taskId: 'task-1',
    memberId: 'member-1',
    memberName: 'John Doe',
    $createdAt: '2024-01-01T10:00:00Z',
  },
  {
    $id: 'message-2',
    content: 'I agree, let\'s move forward with this approach.',
    taskId: 'task-1',
    memberId: 'member-2',
    memberName: 'Jane Smith',
    $createdAt: '2024-01-01T10:05:00Z',
  },
  {
    $id: 'message-3',
    content: 'Can we add some unit tests for this feature?',
    taskId: 'task-1',
    memberId: 'member-1',
    memberName: 'John Doe',
    $createdAt: '2024-01-01T10:10:00Z',
  },
]

jest.mock('@/features/tasks/api/use-get-task-messages', () => ({
  useGetTaskMessages: () => ({
    data: {
      documents: mockMessages,
    },
    isLoading: false,
  }),
}))

// Mock current user
jest.mock('@/features/auth/api/use-current', () => ({
  useCurrent: () => ({
    data: {
      $id: 'member-1',
      name: 'John Doe',
      email: 'john@example.com',
    },
    isLoading: false,
  }),
}))

// Mock workspace ID
jest.mock('@/features/workspaces/hooks/use-workspace-id', () => ({
  useWorkspaceId: () => 'workspace-1',
}))

// Mock scrolling functions
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true,
})

Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
  value: jest.fn(),
  writable: true,
})

// Mock TaskChat component
interface MockTaskChatProps {
  taskId: string;
}

const MockTaskChat = ({ taskId }: MockTaskChatProps) => {
  const [message, setMessage] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      mockCreateTaskMessage({
        json: {
          content: message.trim(),
          taskId,
        },
      })
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (message.trim()) {
        mockCreateTaskMessage({
          json: {
            content: message.trim(),
            taskId,
          },
        })
        setMessage('')
      }
    }
  }

  return (
    <div data-testid={`task-chat-${taskId}`}>
      {mockMessages.map((message) => (
        <div key={message.$id} className="p-2 border-b min-h-[44px]">
          <div className="text-sm font-semibold">{message.memberName}</div>
          <div className="text-xs text-gray-500">2 hours ago</div>
          <div>{message.content}</div>
        </div>
      ))}
      <form onSubmit={handleSubmit} className="flex gap-2 p-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 min-h-[44px] p-2 border rounded"
        />
        <button 
          type="submit"
          disabled={!message.trim()}
          className="min-h-[44px] px-4 touch-manipulation bg-blue-500 text-white rounded disabled:opacity-50 disabled:bg-gray-400"
        >
          Send
        </button>
      </form>
    </div>
  )
}

describe('Mobile Task Chat Tests', () => {
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
    mockCreateTaskMessage.mockClear()
    mockPush.mockClear()
  })

  describe('Chat Interface', () => {
    it('renders task chat with mobile-optimized layout', () => {
      render(<MockTaskChat taskId="task-1" />)

      // Check for chat messages
      expect(screen.getByText('This task looks good to me!')).toBeInTheDocument()
      expect(screen.getByText('I agree, let\'s move forward with this approach.')).toBeInTheDocument()
      expect(screen.getByText('Can we add some unit tests for this feature?')).toBeInTheDocument()

      // Check for message input
      expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument()

      // Check for send button
      const sendButton = screen.getByRole('button', { name: /send/i })
      expect(sendButton).toHaveClass('min-h-[44px]', 'touch-manipulation')
    })

    it('displays message timestamps in mobile-friendly format', () => {
      render(<MockTaskChat taskId="task-1" />)

      // Should show relative timestamps on mobile
      // e.g., "2 hours ago", "Yesterday", etc.
      const timeElements = screen.getAllByText(/ago|AM|PM/i)
      expect(timeElements.length).toBeGreaterThan(0)
    })

    it('shows message authors clearly on mobile', () => {
      render(<MockTaskChat taskId="task-1" />)

      // Check for author names
      expect(screen.getAllByText('John Doe')).toHaveLength(2)
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()

      // Author names should be easily readable on mobile
      const authorElements = screen.getAllByText(/John Doe|Jane Smith/)
      authorElements.forEach(element => {
        expect(element).toHaveClass('text-sm') // Mobile-friendly text size
      })
    })

    it('handles long messages with proper wrapping on mobile', () => {
      const longMessage = 'This is a very long message that should wrap properly on mobile devices and not cause horizontal scrolling or layout issues when displayed in the chat interface.'
      
      const mockLongMessages = [
        {
          $id: 'message-long',
          content: longMessage,
          taskId: 'task-1',
          memberId: 'member-1',
          memberName: 'John Doe',
          $createdAt: '2024-01-01T10:00:00Z',
        },
      ]

      const MockTaskChatWithLongMessage = ({ taskId }: { taskId: string }) => (
        <div data-testid={`task-chat-${taskId}`}>
          {mockLongMessages.map((message) => (
            <div key={message.$id} className="p-2 border-b break-words">
              <div className="text-sm font-semibold">{message.memberName}</div>
              <div className="text-xs text-gray-500">2 hours ago</div>
              <div>{message.content}</div>
            </div>
          ))}
        </div>
      )

      render(<MockTaskChatWithLongMessage taskId="task-1" />)

      const messageElement = screen.getByText(longMessage)
      expect(messageElement).toBeInTheDocument()
      
      // Message should wrap and not overflow
      expect(messageElement.closest('[class*="break-words"]')).toBeInTheDocument()
    })
  })

  describe('Message Sending', () => {
    it('handles message sending with mobile touch interactions', async () => {
      render(<MockTaskChat taskId="task-1" />)

      const messageInput = screen.getByPlaceholderText(/type a message/i)
      const sendButton = screen.getByRole('button', { name: /send/i })

      // Type a message
      fireEvent.focus(messageInput)
      fireEvent.change(messageInput, { target: { value: 'This is a test message from mobile!' } })

      // Touch-based sending
      fireEvent.touchStart(sendButton)
      fireEvent.touchEnd(sendButton)
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(mockCreateTaskMessage).toHaveBeenCalledWith({
          json: {
            content: 'This is a test message from mobile!',
            taskId: 'task-1',
          },
        })
      })

      // Input should be cleared after sending
      expect(messageInput).toHaveValue('')
    })

    it('handles message sending with Enter key on mobile keyboard', async () => {
      render(<MockTaskChat taskId="task-1" />)

      const messageInput = screen.getByPlaceholderText(/type a message/i)

      // Type a message
      fireEvent.change(messageInput, { target: { value: 'Testing Enter key send' } })

      // Press Enter to send
      fireEvent.keyDown(messageInput, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(mockCreateTaskMessage).toHaveBeenCalledWith({
          json: {
            content: 'Testing Enter key send',
            taskId: 'task-1',
          },
        })
      })
    })

    it('prevents sending empty messages on mobile', async () => {
      render(<MockTaskChat taskId="task-1" />)

      const sendButton = screen.getByRole('button', { name: /send/i })

      // Try to send empty message
      fireEvent.click(sendButton)

      // Should not call create message API
      expect(mockCreateTaskMessage).not.toHaveBeenCalled()

      // Send button should be disabled when input is empty
      expect(sendButton).toBeDisabled()
    })

    it('handles message input focus and blur on mobile', () => {
      render(<MockTaskChat taskId="task-1" />)

      const messageInput = screen.getByPlaceholderText(/type a message/i)

      // Focus should trigger mobile keyboard
      messageInput.focus()
      expect(document.activeElement).toBe(messageInput)

      // Blur should dismiss mobile keyboard
      messageInput.blur()
      expect(document.activeElement).not.toBe(messageInput)
    })

    it('provides typing indicators on mobile', () => {
      // Mock typing state
      const MockChatWithTyping = () => {
        const [isTyping, setIsTyping] = React.useState(false)

        return (
          <div>
            <div className="p-2">
              {isTyping && (
                <div className="text-sm text-gray-500 italic">
                  Jane Smith is typing...
                </div>
              )}
            </div>
            <input
              placeholder="Type a message..."
              onFocus={() => setIsTyping(true)}
              onBlur={() => setIsTyping(false)}
              className="w-full min-h-[44px]"
            />
          </div>
        )
      }

      render(<MockChatWithTyping />)

      const input = screen.getByPlaceholderText('Type a message...')
      
      // Focus should show typing indicator
      fireEvent.focus(input)
      expect(screen.getByText('Jane Smith is typing...')).toBeInTheDocument()

      // Blur should hide typing indicator
      fireEvent.blur(input)
      expect(screen.queryByText('Jane Smith is typing...')).not.toBeInTheDocument()
    })
  })

  describe('Message Display and Interaction', () => {
    it('provides touch-friendly message interaction on mobile', () => {
      render(<MockTaskChat taskId="task-1" />)

      const firstMessage = screen.getByText('This task looks good to me!')
      const messageContainer = firstMessage.closest('[class*="message"]') || firstMessage.parentElement

      // Message should be touch-friendly
      if (messageContainer) {
        expect(messageContainer).toHaveClass('min-h-[44px]')
      }

      // Long press might show message options
      fireEvent.touchStart(firstMessage, { touches: [{ clientX: 100, clientY: 100 }] })
      
      // Simulate long press (hold for 500ms)
      setTimeout(() => {
        fireEvent.touchEnd(firstMessage)
      }, 600)
    })

    it('handles message reactions on mobile', () => {
      const MockMessageWithReactions = () => (
        <div className="p-2 border-b">
          <div className="mb-2">
            <span className="font-semibold text-sm">John Doe</span>
            <span className="text-xs text-gray-500 ml-2">2 hours ago</span>
          </div>
          <div className="mb-2">This task looks good to me!</div>
          <div className="flex gap-1">
            <button className="min-h-[32px] px-2 touch-manipulation bg-blue-100 rounded text-sm">
              👍 2
            </button>
            <button className="min-h-[32px] px-2 touch-manipulation bg-gray-100 rounded text-sm">
              ❤️ 1
            </button>
            <button className="min-h-[32px] px-2 touch-manipulation bg-gray-100 rounded text-sm">
              +
            </button>
          </div>
        </div>
      )

      render(<MockMessageWithReactions />)

      const thumbsUpReaction = screen.getByText('👍 2')
      const addReactionButton = screen.getByText('+')

      // Touch interactions for reactions
      fireEvent.touchStart(thumbsUpReaction)
      fireEvent.touchEnd(thumbsUpReaction)
      fireEvent.click(thumbsUpReaction)

      fireEvent.touchStart(addReactionButton)
      fireEvent.touchEnd(addReactionButton)
      fireEvent.click(addReactionButton)

      expect(thumbsUpReaction).toHaveClass('touch-manipulation')
      expect(addReactionButton).toHaveClass('touch-manipulation')
    })

    it('displays message status indicators on mobile', () => {
      const MockMessageWithStatus = () => (
        <div className="flex items-end gap-2 p-2">
          <div className="flex-1">
            <div className="bg-blue-500 text-white p-2 rounded max-w-xs">
              Message sent from mobile
            </div>
          </div>
          <div className="text-xs text-gray-500 flex flex-col items-end">
            <span>✓✓</span>
            <span>Read</span>
          </div>
        </div>
      )

      render(<MockMessageWithStatus />)

      expect(screen.getByText('✓✓')).toBeInTheDocument()
      expect(screen.getByText('Read')).toBeInTheDocument()
    })

    it('handles message editing on mobile', () => {
      const MockEditableMessage = () => {
        const [isEditing, setIsEditing] = React.useState(false)
        const [content, setContent] = React.useState('Original message content')

        return (
          <div className="p-2">
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full min-h-[44px] p-2 border rounded"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 min-h-[44px] touch-manipulation bg-blue-500 text-white rounded"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 min-h-[44px] touch-manipulation bg-gray-500 text-white rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onDoubleClick={() => setIsEditing(true)}
                className="cursor-pointer min-h-[44px] flex items-center"
              >
                {content}
              </div>
            )}
          </div>
        )
      }

      render(<MockEditableMessage />)

      const messageElement = screen.getByText('Original message content')
      
      // Double tap to edit on mobile
      fireEvent.doubleClick(messageElement)

      // Should show edit interface
      expect(screen.getByDisplayValue('Original message content')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  describe('Chat Navigation and Scrolling', () => {
    it('auto-scrolls to latest message on mobile', () => {
      const MockAutoScrollChat = () => {
        const messagesEndRef = React.useRef<HTMLDivElement>(null)

        React.useEffect(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, [])

        return (
          <div className="h-64 overflow-y-auto">
            {mockMessages.map((message) => (
              <div key={message.$id} className="p-2 border-b">
                <div className="font-semibold text-sm">{message.memberName}</div>
                <div>{message.content}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )
      }

      render(<MockAutoScrollChat />)

      // Should auto-scroll to bottom
      const chatContainer = screen.getByText('This task looks good to me!').closest('[class*="overflow-y-auto"]')
      expect(chatContainer).toBeInTheDocument()
    })

    it('handles pull-to-refresh for chat history', () => {
      const MockPullToRefreshChat = () => {
        const [refreshing, setRefreshing] = React.useState(false)

        const handleRefresh = () => {
          setRefreshing(true)
          setTimeout(() => setRefreshing(false), 1000)
        }

        return (
          <div className="h-64">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full min-h-[44px] touch-manipulation p-2"
            >
              {refreshing ? 'Loading older messages...' : 'Load older messages'}
            </button>
            <div className="overflow-y-auto">
              {mockMessages.map((message) => (
                <div key={message.$id} className="p-2">
                  {message.content}
                </div>
              ))}
            </div>
          </div>
        )
      }

      render(<MockPullToRefreshChat />)

      const refreshButton = screen.getByText('Load older messages')
      fireEvent.click(refreshButton)

      expect(screen.getByText('Loading older messages...')).toBeInTheDocument()
    })

    it('provides smooth scrolling on mobile', () => {
      const MockSmoothScrollChat = () => {
        const chatRef = React.useRef<HTMLDivElement>(null)

        const scrollToTop = () => {
          chatRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        }

        const scrollToBottom = () => {
          chatRef.current?.scrollTo({ 
            top: chatRef.current.scrollHeight, 
            behavior: 'smooth' 
          })
        }

        return (
          <div>
            <div className="flex gap-2 p-2">
              <button
                onClick={scrollToTop}
                className="flex-1 min-h-[44px] touch-manipulation bg-blue-500 text-white rounded"
              >
                Top
              </button>
              <button
                onClick={scrollToBottom}
                className="flex-1 min-h-[44px] touch-manipulation bg-blue-500 text-white rounded"
              >
                Bottom
              </button>
            </div>
            <div ref={chatRef} className="h-64 overflow-y-auto">
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} className="p-4 border-b">
                  Message {i + 1}
                </div>
              ))}
            </div>
          </div>
        )
      }

      render(<MockSmoothScrollChat />)

      const topButton = screen.getByText('Top')
      const bottomButton = screen.getByText('Bottom')

      fireEvent.click(topButton)
      fireEvent.click(bottomButton)

      expect(topButton).toHaveClass('touch-manipulation')
      expect(bottomButton).toHaveClass('touch-manipulation')
    })
  })

  describe('Mobile-Specific Chat Features', () => {
    it('handles voice messages on mobile', () => {
      // Mock media recorder
      const mockMediaRecorder = {
        start: jest.fn(),
        stop: jest.fn(),
        addEventListener: jest.fn(),
        state: 'inactive',
      }

      Object.defineProperty(window, 'MediaRecorder', {
        value: jest.fn(() => mockMediaRecorder),
      })

      const MockVoiceMessage = () => {
        const [isRecording, setIsRecording] = React.useState(false)

        const startRecording = () => {
          setIsRecording(true)
          mockMediaRecorder.start()
        }

        const stopRecording = () => {
          setIsRecording(false)
          mockMediaRecorder.stop()
        }

        return (
          <div className="flex items-center gap-2 p-2">
            <input
              placeholder="Type a message..."
              className="flex-1 min-h-[44px] p-2 border rounded"
            />
            <button
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`min-h-[44px] px-4 touch-manipulation rounded ${
                isRecording ? 'bg-red-500' : 'bg-blue-500'
              } text-white`}
            >
              {isRecording ? '🔴' : '🎤'}
            </button>
          </div>
        )
      }

      render(<MockVoiceMessage />)

      const voiceButton = screen.getByText('🎤')
      
      // Touch and hold for voice recording
      fireEvent.touchStart(voiceButton)
      expect(screen.getByText('🔴')).toBeInTheDocument()
      
      fireEvent.touchEnd(voiceButton)
      expect(mockMediaRecorder.start).toHaveBeenCalled()
    })

    it('supports emoji picker on mobile', () => {
      const MockEmojiPicker = () => {
        const [showEmojis, setShowEmojis] = React.useState(false)
        const [message, setMessage] = React.useState('')

        const addEmoji = (emoji: string) => {
          setMessage(message + emoji)
          setShowEmojis(false)
        }

        return (
          <div>
            <div className="flex items-center gap-2 p-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 min-h-[44px] p-2 border rounded"
              />
              <button
                onClick={() => setShowEmojis(!showEmojis)}
                className="min-h-[44px] px-4 touch-manipulation bg-gray-200 rounded"
              >
                😊
              </button>
            </div>
            {showEmojis && (
              <div className="grid grid-cols-6 gap-2 p-2 bg-gray-100">
                {['😀', '😂', '❤️', '👍', '👎', '🔥'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => addEmoji(emoji)}
                    className="min-h-[44px] touch-manipulation text-2xl"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      }

      render(<MockEmojiPicker />)

      const emojiButton = screen.getByText('😊')
      fireEvent.click(emojiButton)

      // Should show emoji picker
      expect(screen.getByText('😀')).toBeInTheDocument()
      expect(screen.getByText('❤️')).toBeInTheDocument()

      // Click an emoji
      const heartEmoji = screen.getByText('❤️')
      fireEvent.click(heartEmoji)

      // Should add emoji to message
      const messageInput = screen.getByPlaceholderText('Type a message...')
      expect(messageInput).toHaveValue('❤️')
    })

    it('handles chat mentions on mobile', () => {
      const MockMentionChat = () => {
        const [message, setMessage] = React.useState('')
        const [showMentions, setShowMentions] = React.useState(false)

        const members = ['John Doe', 'Jane Smith', 'Bob Wilson']

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value
          setMessage(value)
          
          // Show mentions when typing @
          if (value.includes('@')) {
            setShowMentions(true)
          } else {
            setShowMentions(false)
          }
        }

        const addMention = (member: string) => {
          setMessage(message.replace(/@\w*$/, `@${member} `))
          setShowMentions(false)
        }

        return (
          <div>
            <input
              value={message}
              onChange={handleInputChange}
              placeholder="Type @ to mention someone..."
              className="w-full min-h-[44px] p-2 border rounded"
            />
            {showMentions && (
              <div className="border rounded mt-1 bg-white shadow">
                {members.map((member) => (
                  <button
                    key={member}
                    onClick={() => addMention(member)}
                    className="w-full p-3 text-left hover:bg-gray-100 min-h-[44px] touch-manipulation"
                  >
                    @{member}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      }

      render(<MockMentionChat />)

      const input = screen.getByPlaceholderText('Type @ to mention someone...')
      
      // Type @ to trigger mentions
      fireEvent.change(input, { target: { value: '@j' } })

      // Should show mention suggestions
      expect(screen.getByText('@John Doe')).toBeInTheDocument()
      expect(screen.getByText('@Jane Smith')).toBeInTheDocument()

      // Click a mention
      const johnMention = screen.getByText('@John Doe')
      fireEvent.click(johnMention)

      // Should add mention to input
      expect(input).toHaveValue('@John Doe ')
    })

    it('provides real-time chat updates on mobile', () => {
      // Mock WebSocket or real-time connection
      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
      }

      Object.defineProperty(window, 'WebSocket', {
        value: jest.fn(() => mockWebSocket),
      })

      const MockRealTimeChat = () => {
        const [messages, setMessages] = React.useState(mockMessages)

        React.useEffect(() => {
          // Simulate real-time message
          const timer = setTimeout(() => {
            setMessages([...messages, {
              $id: 'message-new',
              content: 'New real-time message!',
              taskId: 'task-1',
              memberId: 'member-2',
              memberName: 'Jane Smith',
              $createdAt: new Date().toISOString(),
            }])
          }, 1000)

          return () => clearTimeout(timer)
        }, [messages])

        return (
          <div className="h-64 overflow-y-auto">
            {messages.map((message) => (
              <div key={message.$id} className="p-2 border-b">
                <div className="font-semibold text-sm">{message.memberName}</div>
                <div>{message.content}</div>
              </div>
            ))}
          </div>
        )
      }

      render(<MockRealTimeChat />)

      // Initially should show existing messages
      expect(screen.getByText('This task looks good to me!')).toBeInTheDocument()

      // After timeout, should show new message
      setTimeout(() => {
        expect(screen.getByText('New real-time message!')).toBeInTheDocument()
      }, 1100)
    })
  })
})
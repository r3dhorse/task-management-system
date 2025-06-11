import React from 'react'
import { render as rtlRender } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

export { screen, waitFor, fireEvent, within } from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

// Create a custom render function that includes providers
export function render(
  ui: React.ReactElement,
  {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    }),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock data factories
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
}

export const mockWorkspace = {
  $id: 'workspace-123',
  name: 'Test Workspace',
  imageUrl: null,
  inviteCode: 'ABC123',
  userId: mockUser.id,
}

export const mockProject = {
  $id: 'project-123',
  name: 'Test Project',
  imageUrl: null,
  workspaceId: mockWorkspace.$id,
}

export const mockTask = {
  $id: 'task-123',
  name: 'Test Task',
  description: 'Test task description',
  status: 'TODO',
  dueDate: new Date().toISOString(),
  assigneeId: mockUser.id,
  projectId: mockProject.$id,
  workspaceId: mockWorkspace.$id,
  position: 1000,
}

export const mockMember = {
  $id: 'member-123',
  userId: mockUser.id,
  workspaceId: mockWorkspace.$id,
  role: 'MEMBER',
}

// Helper to create mock API responses
export function createMockResponse<T>(data: T) {
  return Promise.resolve({
    data,
    error: null,
  })
}

// Helper to create mock error responses
export function createMockError(message: string) {
  return Promise.reject(new Error(message))
}

// Mock next/navigation
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
}

export const mockUseRouter = () => mockRouter

// Re-export everything from testing library
export * from '@testing-library/react'
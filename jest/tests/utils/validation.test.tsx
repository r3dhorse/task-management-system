import { z } from 'zod'

// Mock validation schemas
const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
})

const workspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  description: z.string().optional(),
})

const taskSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  projectId: z.string().min(1, 'Project is required'),
})

describe('Validation Schemas', () => {
  describe('User Schema', () => {
    it('validates valid user data', () => {
      const validUser = {
        email: 'test@example.com',
        password: 'password123',
        name: 'John Doe',
      }

      const result = userSchema.safeParse(validUser)
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const invalidUser = {
        email: 'invalid-email',
        password: 'password123',
        name: 'John Doe',
      }

      const result = userSchema.safeParse(invalidUser)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid email address')
      }
    })

    it('rejects short password', () => {
      const invalidUser = {
        email: 'test@example.com',
        password: '123',
        name: 'John Doe',
      }

      const result = userSchema.safeParse(invalidUser)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password must be at least 8 characters')
      }
    })
  })

  describe('Workspace Schema', () => {
    it('validates valid workspace data', () => {
      const validWorkspace = {
        name: 'My Workspace',
        description: 'A great workspace',
      }

      const result = workspaceSchema.safeParse(validWorkspace)
      expect(result.success).toBe(true)
    })

    it('rejects empty workspace name', () => {
      const invalidWorkspace = {
        name: '',
        description: 'A workspace without name',
      }

      const result = workspaceSchema.safeParse(invalidWorkspace)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Workspace name is required')
      }
    })
  })

  describe('Task Schema', () => {
    it('validates valid task data', () => {
      const validTask = {
        name: 'Complete project',
        description: 'Finish the task management app',
        status: 'TODO' as const,
        dueDate: '2024-12-31',
        assigneeId: 'user-123',
        projectId: 'project-123',
      }

      const result = taskSchema.safeParse(validTask)
      expect(result.success).toBe(true)
    })

    it('rejects invalid status', () => {
      const invalidTask = {
        name: 'Complete project',
        status: 'INVALID_STATUS',
        projectId: 'project-123',
      }

      const result = taskSchema.safeParse(invalidTask)
      expect(result.success).toBe(false)
    })

    it('rejects task without project', () => {
      const invalidTask = {
        name: 'Complete project',
        status: 'TODO' as const,
        projectId: '',
      }

      const result = taskSchema.safeParse(invalidTask)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Project is required')
      }
    })
  })
})
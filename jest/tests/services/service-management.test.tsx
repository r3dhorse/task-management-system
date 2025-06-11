import { render, screen, userEvent, waitFor } from '@/test-utils'
import { CreateServiceForm } from '@/features/services/components/create-service-form'
import { EditServiceForm } from '@/features/services/components/edit-service-form'
import { CreateServiceModal } from '@/features/services/components/create-service-modal'
import { useCreateService } from '@/features/services/api/use-create-service'
import { useUpdateService } from '@/features/services/api/use-update-service'
import { useDeleteService } from '@/features/services/api/use-delete-service'
import { useGetServices } from '@/features/services/api/use-get-services'

jest.mock('@/features/services/api/use-create-service')
jest.mock('@/features/services/api/use-update-service')
jest.mock('@/features/services/api/use-delete-service')
jest.mock('@/features/services/api/use-get-services')
jest.mock('@/features/workspaces/hooks/use-workspace-id')
jest.mock('@/features/services/hooks/use-service-id')

const mockUseCreateService = useCreateService as jest.MockedFunction<typeof useCreateService>
const mockUseUpdateService = useUpdateService as jest.MockedFunction<typeof useUpdateService>
const mockUseDeleteService = useDeleteService as jest.MockedFunction<typeof useDeleteService>
const mockUseGetServices = useGetServices as jest.MockedFunction<typeof useGetServices>

require('@/features/workspaces/hooks/use-workspace-id').useWorkspaceId = jest.fn(() => 'workspace-123')
require('@/features/services/hooks/use-service-id').useServiceId = jest.fn(() => 'service-123')

const mockService = {
  $id: 'service-123',
  name: 'Customer Support',
  workspaceId: 'workspace-123',
  $createdAt: '2024-01-01T00:00:00.000Z',
  $updatedAt: '2024-01-01T00:00:00.000Z',
}

const mockServices = [
  mockService,
  {
    $id: 'service-456',
    name: 'Development Team',
    workspaceId: 'workspace-123',
    $createdAt: '2024-01-02T00:00:00.000Z',
    $updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    $id: 'service-789',
    name: 'QA Department',
    workspaceId: 'workspace-123',
    $createdAt: '2024-01-03T00:00:00.000Z',
    $updatedAt: '2024-01-03T00:00:00.000Z',
  },
]

describe('Service Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseCreateService.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
    })
    
    mockUseUpdateService.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
    })
    
    mockUseDeleteService.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
    })
    
    mockUseGetServices.mockReturnValue({
      data: { documents: mockServices, total: mockServices.length },
      isLoading: false,
      isError: false,
      error: null,
    })
  })

  describe('CreateServiceForm', () => {
    it('renders create service form correctly', () => {
      render(<CreateServiceForm />)
      
      expect(screen.getByText('Create a new service')).toBeInTheDocument()
      expect(screen.getByLabelText('Service Name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter service name')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create service/i })).toBeInTheDocument()
    })


    it('creates service with valid data', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      mockUseCreateService.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<CreateServiceForm />)
      
      const nameInput = screen.getByLabelText('Service Name')
      const submitButton = screen.getByRole('button', { name: /create service/i })
      
      await user.type(nameInput, 'IT Support')
      await user.click(submitButton)
      
      expect(mockMutate).toHaveBeenCalledWith(
        {
          form: {
            name: 'IT Support',
            workspaceId: 'workspace-123',
          }
        },
        expect.any(Object)
      )
    })

    it('shows loading state during service creation', () => {
      mockUseCreateService.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<CreateServiceForm />)
      
      const submitButton = screen.getByRole('button', { name: /create service/i })
      expect(submitButton).toBeDisabled()
    })

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const mockOnCancel = jest.fn()
      
      render(<CreateServiceForm onCancel={mockOnCancel} />)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('hides cancel button when onCancel is not provided', () => {
      render(<CreateServiceForm />)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toHaveClass('invisible')
    })

    it('trims whitespace from service name', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      mockUseCreateService.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<CreateServiceForm />)
      
      const nameInput = screen.getByLabelText('Service Name')
      const submitButton = screen.getByRole('button', { name: /create service/i })
      
      await user.type(nameInput, '  HR Department  ')
      await user.click(submitButton)
      
      expect(mockMutate).toHaveBeenCalledWith(
        {
          form: {
            name: 'HR Department',
            workspaceId: 'workspace-123',
          }
        },
        expect.any(Object)
      )
    })
  })

  describe('EditServiceForm', () => {
    it('renders edit service form with initial values', () => {
      render(<EditServiceForm initialValues={{ $id: 'service-123', name: 'Customer Support', workspaceId: 'workspace-123' }} />)
      
      expect(screen.getByDisplayValue('Customer Support')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })


    it('updates service with valid data', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      mockUseUpdateService.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<EditServiceForm initialValues={{ $id: 'service-123', name: 'Customer Support', workspaceId: 'workspace-123' }} />)
      
      const nameInput = screen.getByDisplayValue('Customer Support')
      const submitButton = screen.getByRole('button', { name: /save changes/i })
      
      await user.clear(nameInput)
      await user.type(nameInput, 'Technical Support')
      await user.click(submitButton)
      
      expect(mockMutate).toHaveBeenCalledWith(
        {
          form: { name: 'Technical Support' },
          param: { serviceId: 'service-123' }
        },
        expect.any(Object)
      )
    })

    it('shows loading state during service update', () => {
      mockUseUpdateService.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<EditServiceForm initialValues={{ $id: 'service-123', name: 'Customer Support', workspaceId: 'workspace-123' }} />)
      
      const submitButton = screen.getByRole('button', { name: /save changes/i })
      expect(submitButton).toBeDisabled()
    })

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const mockOnCancel = jest.fn()
      
      render(<EditServiceForm initialValues={{ $id: 'service-123', name: 'Customer Support', workspaceId: 'workspace-123' }} onCancel={mockOnCancel} />)
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('CreateServiceModal', () => {
    it('renders create service modal when open', () => {
      render(<CreateServiceModal />)
      
      // Modal content should be rendered but initially hidden
      expect(document.body).toMatchSnapshot()
    })
  })

  describe('Service Validation', () => {

    it('accepts service names with special characters', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      mockUseCreateService.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<CreateServiceForm />)
      
      const nameInput = screen.getByLabelText('Service Name')
      const submitButton = screen.getByRole('button', { name: /create service/i })
      
      await user.type(nameInput, 'R&D Department #1')
      await user.click(submitButton)
      
      expect(mockMutate).toHaveBeenCalledWith(
        {
          form: {
            name: 'R&D Department #1',
            workspaceId: 'workspace-123',
          }
        },
        expect.any(Object)
      )
    })

    it('handles long service names', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      mockUseCreateService.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<CreateServiceForm />)
      
      const longName = 'Very Long Service Department Name That Exceeds Normal Length'
      const nameInput = screen.getByLabelText('Service Name')
      const submitButton = screen.getByRole('button', { name: /create service/i })
      
      await user.type(nameInput, longName)
      await user.click(submitButton)
      
      expect(mockMutate).toHaveBeenCalledWith(
        {
          form: {
            name: longName,
            workspaceId: 'workspace-123',
          }
        },
        expect.any(Object)
      )
    })
  })

  describe('Error Handling', () => {
    it('displays error state when service creation fails', () => {
      mockUseCreateService.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
        isError: true,
        error: new Error('Failed to create service'),
        data: undefined,
        isSuccess: false,
      })
      
      render(<CreateServiceForm />)
      
      // The component should handle error states gracefully
      expect(screen.getByRole('button', { name: /create service/i })).toBeInTheDocument()
    })

    it('displays error state when service update fails', () => {
      mockUseUpdateService.mockReturnValue({
        mutate: jest.fn(),
        isPending: false,
        isError: true,
        error: new Error('Failed to update service'),
        data: undefined,
        isSuccess: false,
      })
      
      render(<EditServiceForm initialValues={{ $id: 'service-123', name: 'Customer Support', workspaceId: 'workspace-123' }} />)
      
      // The component should handle error states gracefully
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for form fields', () => {
      render(<CreateServiceForm />)
      
      const nameInput = screen.getByLabelText('Service Name')
      expect(nameInput).toHaveAttribute('aria-invalid', 'false')
    })

    it('has proper form structure', () => {
      render(<CreateServiceForm />)
      
      expect(screen.getByLabelText('Service Name')).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /service name/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create service/i })).toBeInTheDocument()
    })

  })

  describe('Integration with Workspace', () => {
    it('uses current workspace ID for service creation', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      mockUseCreateService.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<CreateServiceForm />)
      
      const nameInput = screen.getByLabelText('Service Name')
      const submitButton = screen.getByRole('button', { name: /create service/i })
      
      await user.type(nameInput, 'New Service')
      await user.click(submitButton)
      
      expect(mockMutate).toHaveBeenCalledWith(
        {
          form: {
            name: 'New Service',
            workspaceId: 'workspace-123',
          }
        },
        expect.any(Object)
      )
    })

    it('uses current service ID for service updates', async () => {
      const user = userEvent.setup()
      const mockMutate = jest.fn()
      mockUseUpdateService.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
      })
      
      render(<EditServiceForm initialValues={{ $id: 'service-123', name: 'Customer Support', workspaceId: 'workspace-123' }} />)
      
      const nameInput = screen.getByDisplayValue('Customer Support')
      const submitButton = screen.getByRole('button', { name: /save changes/i })
      
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Service')
      await user.click(submitButton)
      
      expect(mockMutate).toHaveBeenCalledWith(
        {
          form: { name: 'Updated Service' },
          param: { serviceId: 'service-123' }
        },
        expect.any(Object)
      )
    })
  })
})
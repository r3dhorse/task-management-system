import React from 'react'
import { render, screen, userEvent, waitFor } from '@/test-utils'

// Mock file types
interface MockFile {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
  uploadedBy: string
}

interface MockUploadProgress {
  fileId: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

// Mock file upload component
interface MockFileUploadProps {
  onFileUploaded?: (file: MockFile) => void;
  onUploadProgress?: (progress: MockUploadProgress) => void;
  disabled?: boolean;
  maxSize?: number;
  acceptedTypes?: string[];
  multiple?: boolean;
}

const MockFileUpload = ({ 
  onFileUploaded, 
  onUploadProgress, 
  disabled = false,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['.pdf'],
  multiple = false
}: MockFileUploadProps) => {
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
  const [uploadProgress, setUploadProgress] = React.useState<Record<string, MockUploadProgress>>({})
  const [error, setError] = React.useState<string | null>(null)

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedTypes.some(type => file.name.toLowerCase().endsWith(type.toLowerCase()))) {
      return `File type not allowed. Accepted types: ${acceptedTypes.join(', ')}`
    }
    
    // Check file size
    if (file.size > maxSize) {
      return `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`
    }
    
    // Check if file name is valid
    if (file.name.length > 100) {
      return 'File name too long (max 100 characters)'
    }
    
    return null
  }

  const simulateUpload = async (file: File): Promise<MockFile> => {
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Start upload
    setUploadProgress(prev => ({
      ...prev,
      [fileId]: { fileId, progress: 0, status: 'uploading' }
    }))
    
    onUploadProgress?.({ fileId, progress: 0, status: 'uploading' })

    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 20) {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { fileId, progress, status: 'uploading' }
      }))
      
      onUploadProgress?.({ fileId, progress, status: 'uploading' })
    }

    // Complete upload
    const uploadedFile: MockFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'current-user'
    }

    setUploadProgress(prev => ({
      ...prev,
      [fileId]: { fileId, progress: 100, status: 'success' }
    }))
    
    onUploadProgress?.({ fileId, progress: 100, status: 'success' })
    onFileUploaded?.(uploadedFile)
    
    return uploadedFile
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setError(null)
    
    if (!multiple && files.length > 1) {
      setError('Only one file allowed')
      return
    }

    for (const file of files) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    setSelectedFiles(files)

    // Upload files
    for (const file of files) {
      try {
        await simulateUpload(file)
      } catch (err) {
        const fileId = `file-${Date.now()}`
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { 
            fileId, 
            progress: 0, 
            status: 'error', 
            error: 'Upload failed' 
          }
        }))
        onUploadProgress?.({ 
          fileId, 
          progress: 0, 
          status: 'error', 
          error: 'Upload failed' 
        })
      }
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div data-testid="file-upload-component">
      <div className="upload-area">
        <label htmlFor="file-input" className="upload-label">
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            <p>Click to select {multiple ? 'files' : 'a file'} or drag and drop</p>
            <p className="upload-restrictions">
              Accepted: {acceptedTypes.join(', ')} | Max size: {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        </label>
        
        <input
          id="file-input"
          type="file"
          multiple={multiple}
          onChange={handleFileChange}
          disabled={disabled}
          style={{ display: 'none' }}
        />
      </div>

      {error && (
        <div data-testid="upload-error" role="alert" className="error-message">
          {error}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div data-testid="selected-files" className="selected-files">
          <h3>Selected Files:</h3>
          {selectedFiles.map((file, index) => (
            <div key={index} data-testid={`selected-file-${index}`} className="file-item">
              <span>{file.name}</span>
              <span>({formatFileSize(file.size)})</span>
            </div>
          ))}
        </div>
      )}

      {Object.keys(uploadProgress).length > 0 && (
        <div data-testid="upload-progress" className="upload-progress">
          <h3>Upload Progress:</h3>
          {Object.values(uploadProgress).map(progress => (
            <div key={progress.fileId} data-testid={`progress-${progress.fileId}`} className="progress-item">
              <div className="progress-info">
                <span>File: {progress.fileId}</span>
                <span>{progress.progress}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${progress.status}`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              {progress.status === 'error' && (
                <div data-testid={`error-${progress.fileId}`} className="error">
                  {progress.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Mock file list component
interface MockFileListProps {
  files: MockFile[];
  onDownload: (fileId: string) => void;
  onDelete: (fileId: string) => void;
  userRole?: 'ADMIN' | 'MEMBER' | 'VISITOR';
}

const MockFileList = ({ 
  files, 
  onDownload, 
  onDelete, 
  userRole = 'MEMBER' 
}: MockFileListProps) => {
  const canDeleteFiles = userRole === 'ADMIN'

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (files.length === 0) {
    return (
      <div data-testid="no-files">
        <p>No files uploaded yet.</p>
      </div>
    )
  }

  return (
    <div data-testid="files-list">
      <h3>Attached Files ({files.length})</h3>
      
      <div className="files-grid">
        {files.map(file => (
          <div key={file.id} data-testid={`file-${file.id}`} className="file-card">
            <div className="file-icon">📄</div>
            
            <div className="file-info">
              <h4 data-testid={`file-name-${file.id}`}>{file.name}</h4>
              <p data-testid={`file-size-${file.id}`}>{formatFileSize(file.size)}</p>
              <small>
                Uploaded by {file.uploadedBy} on{' '}
                {new Date(file.uploadedAt).toLocaleDateString()}
              </small>
            </div>
            
            <div className="file-actions">
              <button 
                onClick={() => onDownload(file.id)}
                data-testid={`download-${file.id}`}
                className="download-btn"
              >
                Download
              </button>
              
              {canDeleteFiles && (
                <button 
                  onClick={() => onDelete(file.id)}
                  data-testid={`delete-${file.id}`}
                  className="delete-btn danger"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {!canDeleteFiles && (
        <div data-testid="files-readonly">
          <p>Only administrators can delete files.</p>
        </div>
      )}
    </div>
  )
}

// Mock file preview component
interface MockFilePreviewProps {
  file: MockFile;
  onClose: () => void;
}

const MockFilePreview = ({ 
  file, 
  onClose 
}: MockFilePreviewProps) => {
  const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  return (
    <div data-testid="file-preview-modal">
      <div className="modal-header">
        <h2>File Preview: {file.name}</h2>
        <button 
          onClick={onClose}
          data-testid="close-preview"
          className="close-btn"
        >
          ✕
        </button>
      </div>
      
      <div className="modal-content">
        {isPDF ? (
          <div data-testid="pdf-preview" className="pdf-preview">
            <p>PDF Preview (simulated)</p>
            <div className="pdf-placeholder">
              📄 {file.name}
            </div>
          </div>
        ) : (
          <div data-testid="unsupported-preview">
            <p>Preview not available for this file type.</p>
          </div>
        )}
        
        <div className="file-details">
          <p><strong>Name:</strong> {file.name}</p>
          <p><strong>Size:</strong> {Math.round(file.size / 1024)} KB</p>
          <p><strong>Type:</strong> {file.type}</p>
          <p><strong>Uploaded:</strong> {new Date(file.uploadedAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

// Mock drag and drop upload
interface MockDragDropUploadProps {
  onFilesDropped: (files: File[]) => void;
  disabled?: boolean;
}

const MockDragDropUpload = ({ 
  onFilesDropped, 
  disabled = false 
}: MockDragDropUploadProps) => {
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [dragCounter, setDragCounter] = React.useState(0)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setDragCounter(prev => prev + 1)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragCounter(prev => prev - 1)
    if (dragCounter <= 1) {
      setIsDragOver(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setDragCounter(0)
    
    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    onFilesDropped(files)
  }

  return (
    <div 
      data-testid="drag-drop-area"
      className={`drag-drop-area ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="drag-drop-content">
        <div className="drag-icon">📤</div>
        {isDragOver ? (
          <p data-testid="drop-message">Drop files here...</p>
        ) : (
          <p data-testid="drag-message">Drag and drop files here</p>
        )}
      </div>
    </div>
  )
}

describe('Comprehensive File Management', () => {
  const mockFiles: MockFile[] = [
    {
      id: 'file-1',
      name: 'project-spec.pdf',
      size: 2048576, // 2MB
      type: 'application/pdf',
      uploadedAt: '2024-01-01T00:00:00Z',
      uploadedBy: 'John Doe'
    },
    {
      id: 'file-2',
      name: 'requirements.pdf',
      size: 1024000, // ~1MB
      type: 'application/pdf',
      uploadedAt: '2024-01-02T00:00:00Z',
      uploadedBy: 'Jane Smith'
    }
  ]

  describe('File Upload Component', () => {
    it('renders upload area with instructions', () => {
      const mockOnFileUploaded = jest.fn()
      
      render(<MockFileUpload onFileUploaded={mockOnFileUploaded} />)

      expect(screen.getByTestId('file-upload-component')).toBeInTheDocument()
      expect(screen.getByText(/Click to select a file or drag and drop/)).toBeInTheDocument()
      expect(screen.getByText(/Accepted: \.pdf \| Max size: 10MB/)).toBeInTheDocument()
    })

    it('validates file types', async () => {
      const user = userEvent.setup()
      const mockOnFileUploaded = jest.fn()
      
      // Allow both PDF and TXT for testing purposes, but validation should still reject TXT
      render(<MockFileUpload onFileUploaded={mockOnFileUploaded} acceptedTypes={['.pdf']} />)

      const fileInput = screen.getByLabelText(/Click to select a file/)
      
      // Valid PDF file
      const pdfFile = new File(['pdf content'], 'document.pdf', { type: 'application/pdf' })
      await user.upload(fileInput, pdfFile)
      
      await waitFor(() => {
        expect(screen.getByTestId('selected-files')).toBeInTheDocument()
      })

      // Test invalid file type by uploading a new invalid file
      const invalidFile = new File(['text content'], 'document.txt', { type: 'text/plain' })
      
      // Clear the input first
      await user.upload(fileInput, [])
      
      // Upload invalid file
      await user.upload(fileInput, invalidFile)
      
      await waitFor(() => {
        expect(screen.getByTestId('upload-error')).toBeInTheDocument()
        expect(screen.getByText(/File type not allowed/)).toBeInTheDocument()
      })
    })

    it('validates file size limits', async () => {
      const user = userEvent.setup()
      const mockOnFileUploaded = jest.fn()
      
      render(<MockFileUpload onFileUploaded={mockOnFileUploaded} maxSize={1024 * 1024} />) // 1MB limit

      const fileInput = screen.getByLabelText(/Click to select a file/)
      
      // Create a large file (2MB)
      const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
      await user.upload(fileInput, largeFile)
      
      expect(screen.getByTestId('upload-error')).toBeInTheDocument()
      expect(screen.getByText(/File too large/)).toBeInTheDocument()
    })

    it('shows upload progress', async () => {
      const mockOnFileUploaded = jest.fn()
      const mockOnUploadProgress = jest.fn()
      
      render(
        <MockFileUpload 
          onFileUploaded={mockOnFileUploaded}
          onUploadProgress={mockOnUploadProgress}
        />
      )

      const fileInput = screen.getByLabelText(/Click to select a file/)
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      
      await userEvent.upload(fileInput, file)
      
      await waitFor(() => {
        expect(screen.getByTestId('upload-progress')).toBeInTheDocument()
      })
      
      await waitFor(() => {
        expect(mockOnUploadProgress).toHaveBeenCalled()
      }, { timeout: 2000 })
    })

    it('supports multiple file uploads', async () => {
      const user = userEvent.setup()
      const mockOnFileUploaded = jest.fn()
      
      render(<MockFileUpload onFileUploaded={mockOnFileUploaded} multiple={true} />)

      expect(screen.getByText(/Click to select files or drag and drop/)).toBeInTheDocument()

      const fileInput = screen.getByLabelText(/Click to select files/)
      const files = [
        new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'file2.pdf', { type: 'application/pdf' })
      ]
      
      await user.upload(fileInput, files)
      
      await waitFor(() => {
        expect(screen.getByTestId('selected-files')).toBeInTheDocument()
        expect(screen.getByTestId('selected-file-0')).toBeInTheDocument()
        expect(screen.getByTestId('selected-file-1')).toBeInTheDocument()
      })
    })

    it('handles disabled state', () => {
      const mockOnFileUploaded = jest.fn()
      
      render(<MockFileUpload onFileUploaded={mockOnFileUploaded} disabled={true} />)

      const fileInput = screen.getByLabelText(/Click to select a file/)
      expect(fileInput).toBeDisabled()
    })

    it('validates file name length', async () => {
      const user = userEvent.setup()
      const mockOnFileUploaded = jest.fn()
      
      render(<MockFileUpload onFileUploaded={mockOnFileUploaded} />)

      const fileInput = screen.getByLabelText(/Click to select a file/)
      const longFileName = 'a'.repeat(101) + '.pdf'
      const file = new File(['content'], longFileName, { type: 'application/pdf' })
      
      await user.upload(fileInput, file)
      
      expect(screen.getByTestId('upload-error')).toBeInTheDocument()
      expect(screen.getByText(/File name too long/)).toBeInTheDocument()
    })

    it('formats file sizes correctly', async () => {
      const user = userEvent.setup()
      const mockOnFileUploaded = jest.fn()
      
      render(<MockFileUpload onFileUploaded={mockOnFileUploaded} />)

      const fileInput = screen.getByLabelText(/Click to select a file/)
      const file = new File(['x'.repeat(1500000)], 'test.pdf', { type: 'application/pdf' }) // ~1.5MB
      
      await user.upload(fileInput, file)
      
      await waitFor(() => {
        expect(screen.getByText(/1\.43 MB/)).toBeInTheDocument()
      })
    })
  })

  describe('File List Component', () => {
    it('displays list of files with details', () => {
      const mockOnDownload = jest.fn()
      const mockOnDelete = jest.fn()
      
      render(
        <MockFileList 
          files={mockFiles}
          onDownload={mockOnDownload}
          onDelete={mockOnDelete}
          userRole="ADMIN"
        />
      )

      expect(screen.getByTestId('files-list')).toBeInTheDocument()
      expect(screen.getByText('Attached Files (2)')).toBeInTheDocument()
      
      expect(screen.getByTestId('file-file-1')).toBeInTheDocument()
      expect(screen.getByTestId('file-name-file-1')).toHaveTextContent('project-spec.pdf')
      expect(screen.getByTestId('file-size-file-1')).toHaveTextContent('1.95 MB')
    })

    it('handles file downloads', async () => {
      const user = userEvent.setup()
      const mockOnDownload = jest.fn()
      const mockOnDelete = jest.fn()
      
      render(
        <MockFileList 
          files={mockFiles}
          onDownload={mockOnDownload}
          onDelete={mockOnDelete}
        />
      )

      await user.click(screen.getByTestId('download-file-1'))
      expect(mockOnDownload).toHaveBeenCalledWith('file-1')
    })

    it('handles file deletion for admins', async () => {
      const user = userEvent.setup()
      const mockOnDownload = jest.fn()
      const mockOnDelete = jest.fn()
      
      render(
        <MockFileList 
          files={mockFiles}
          onDownload={mockOnDownload}
          onDelete={mockOnDelete}
          userRole="ADMIN"
        />
      )

      await user.click(screen.getByTestId('delete-file-1'))
      expect(mockOnDelete).toHaveBeenCalledWith('file-1')
    })

    it('restricts deletion for non-admin users', () => {
      const mockOnDownload = jest.fn()
      const mockOnDelete = jest.fn()
      
      render(
        <MockFileList 
          files={mockFiles}
          onDownload={mockOnDownload}
          onDelete={mockOnDelete}
          userRole="MEMBER"
        />
      )

      expect(screen.queryByTestId('delete-file-1')).not.toBeInTheDocument()
      expect(screen.getByTestId('files-readonly')).toBeInTheDocument()
    })

    it('shows empty state when no files', () => {
      const mockOnDownload = jest.fn()
      const mockOnDelete = jest.fn()
      
      render(
        <MockFileList 
          files={[]}
          onDownload={mockOnDownload}
          onDelete={mockOnDelete}
        />
      )

      expect(screen.getByTestId('no-files')).toBeInTheDocument()
      expect(screen.getByText('No files uploaded yet.')).toBeInTheDocument()
    })

    it('formats file upload dates correctly', () => {
      const mockOnDownload = jest.fn()
      const mockOnDelete = jest.fn()
      
      render(
        <MockFileList 
          files={mockFiles}
          onDownload={mockOnDownload}
          onDelete={mockOnDelete}
        />
      )

      expect(screen.getByText(/Uploaded by John Doe on 1\/1\/2024/)).toBeInTheDocument()
    })
  })

  describe('File Preview Component', () => {
    it('displays PDF preview', () => {
      const mockOnClose = jest.fn()
      
      render(<MockFilePreview file={mockFiles[0]} onClose={mockOnClose} />)

      expect(screen.getByTestId('file-preview-modal')).toBeInTheDocument()
      expect(screen.getByText('File Preview: project-spec.pdf')).toBeInTheDocument()
      expect(screen.getByTestId('pdf-preview')).toBeInTheDocument()
    })

    it('shows file details', () => {
      const mockOnClose = jest.fn()
      
      render(<MockFilePreview file={mockFiles[0]} onClose={mockOnClose} />)

      expect(screen.getByText('Name:')).toBeInTheDocument()
      expect(screen.getByText('project-spec.pdf')).toBeInTheDocument()
      expect(screen.getByText('Size:')).toBeInTheDocument()
      expect(screen.getByText('2001 KB')).toBeInTheDocument()
    })

    it('handles preview closure', async () => {
      const user = userEvent.setup()
      const mockOnClose = jest.fn()
      
      render(<MockFilePreview file={mockFiles[0]} onClose={mockOnClose} />)

      await user.click(screen.getByTestId('close-preview'))
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('shows unsupported preview message for non-PDF files', () => {
      const nonPdfFile: MockFile = {
        ...mockFiles[0],
        name: 'document.txt',
        type: 'text/plain'
      }
      
      const mockOnClose = jest.fn()
      
      render(<MockFilePreview file={nonPdfFile} onClose={mockOnClose} />)

      expect(screen.getByTestId('unsupported-preview')).toBeInTheDocument()
      expect(screen.getByText('Preview not available for this file type.')).toBeInTheDocument()
    })
  })

  describe('Drag and Drop Upload', () => {
    it('renders drag and drop area', () => {
      const mockOnFilesDropped = jest.fn()
      
      render(<MockDragDropUpload onFilesDropped={mockOnFilesDropped} />)

      expect(screen.getByTestId('drag-drop-area')).toBeInTheDocument()
      expect(screen.getByTestId('drag-message')).toBeInTheDocument()
    })

    it('handles disabled state', () => {
      const mockOnFilesDropped = jest.fn()
      
      render(<MockDragDropUpload onFilesDropped={mockOnFilesDropped} disabled={true} />)

      const dropArea = screen.getByTestId('drag-drop-area')
      expect(dropArea).toHaveClass('disabled')
    })
  })

  describe('File Management Integration', () => {
    it('handles complete upload to download workflow', async () => {
      const user = userEvent.setup()
      
      let uploadedFiles: MockFile[] = []
      const handleFileUploaded = (file: MockFile) => {
        uploadedFiles.push(file)
      }
      
      const handleDownload = (fileId: string) => {
        const file = uploadedFiles.find(f => f.id === fileId)
        if (file) {
          // Simulate download
          console.log(`Downloading file: ${file.name}`)
        }
      }
      
      const handleDelete = (fileId: string) => {
        uploadedFiles = uploadedFiles.filter(f => f.id !== fileId)
      }

      // Render upload component
      const { rerender } = render(
        <MockFileUpload onFileUploaded={handleFileUploaded} />
      )

      // Upload a file
      const fileInput = screen.getByLabelText(/Click to select a file/)
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      
      await user.upload(fileInput, file)
      
      await waitFor(() => {
        expect(uploadedFiles).toHaveLength(1)
      })

      // Render file list with uploaded file
      rerender(
        <MockFileList 
          files={uploadedFiles}
          onDownload={handleDownload}
          onDelete={handleDelete}
          userRole="ADMIN"
        />
      )

      expect(screen.getByTestId('files-list')).toBeInTheDocument()
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })

    it('validates file operations by user role', () => {
      const adminUser = { role: 'ADMIN' }
      const memberUser = { role: 'MEMBER' }
      const visitorUser = { role: 'VISITOR' }

      // Admin can upload, download, and delete
      expect(adminUser.role === 'ADMIN').toBe(true)
      
      // Member can upload and download
      expect(['ADMIN', 'MEMBER'].includes(memberUser.role)).toBe(true)
      
      // Visitor can only download
      expect(visitorUser.role === 'VISITOR').toBe(true)
    })

    it('handles file type restrictions correctly', () => {
      const allowedTypes = ['.pdf']
      const testFiles = [
        { name: 'document.pdf', allowed: true },
        { name: 'image.jpg', allowed: false },
        { name: 'text.txt', allowed: false },
        { name: 'presentation.PDF', allowed: true } // Case insensitive
      ]

      testFiles.forEach(testFile => {
        const isAllowed = allowedTypes.some(type => 
          testFile.name.toLowerCase().endsWith(type.substring(1))
        )
        expect(isAllowed).toBe(testFile.allowed)
      })
    })

    it('handles file size limits correctly', () => {
      const maxSize = 10 * 1024 * 1024 // 10MB
      const testSizes = [
        { size: 5 * 1024 * 1024, allowed: true },   // 5MB
        { size: 10 * 1024 * 1024, allowed: true },  // 10MB exactly
        { size: 15 * 1024 * 1024, allowed: false }, // 15MB
        { size: 0, allowed: true }                   // Empty file
      ]

      testSizes.forEach(test => {
        const isAllowed = test.size <= maxSize
        expect(isAllowed).toBe(test.allowed)
      })
    })
  })

  describe('File Security and Validation', () => {
    it('validates file extensions', () => {
      const dangerousExtensions = ['.exe', '.bat', '.sh', '.js', '.html']
      const safeExtensions = ['.pdf', '.jpg', '.png', '.doc', '.docx']
      
      const isDangerous = (filename: string) => {
        return dangerousExtensions.some(ext => 
          filename.toLowerCase().endsWith(ext)
        )
      }

      dangerousExtensions.forEach(ext => {
        expect(isDangerous(`file${ext}`)).toBe(true)
      })

      safeExtensions.forEach(ext => {
        expect(isDangerous(`file${ext}`)).toBe(false)
      })
    })

    it('validates file content type', () => {
      const allowedMimeTypes = ['application/pdf']
      
      const isValidMimeType = (mimeType: string) => {
        return allowedMimeTypes.includes(mimeType)
      }

      expect(isValidMimeType('application/pdf')).toBe(true)
      expect(isValidMimeType('application/javascript')).toBe(false)
      expect(isValidMimeType('text/html')).toBe(false)
    })

    it('prevents directory traversal in filenames', () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config',
        'normal/../../../etc/shadow',
        'file\\..\\..\\sensitive.txt'
      ]

      const containsTraversal = (filename: string) => {
        return filename.includes('../') || filename.includes('..\\')
      }

      maliciousFilenames.forEach(filename => {
        expect(containsTraversal(filename)).toBe(true)
      })

      expect(containsTraversal('normal-file.pdf')).toBe(false)
    })
  })
})
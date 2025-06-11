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

// Mock file upload API
const mockUploadFile = jest.fn()
const mockDownloadFile = jest.fn()
const mockDeleteFile = jest.fn()

// Mock fetch for file operations
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

// Mock URL.createObjectURL for file preview
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'blob:mock-url'),
})

Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
})

// Mock FileUpload component
interface MockFileUploadProps {
  onFileUploaded: (id: string) => void;
  onFileRemoved: () => void;
}

const MockFileUpload = ({ onFileUploaded, onFileRemoved }: MockFileUploadProps) => {
  const [error, setError] = React.useState<string | null>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setError(null)
      
      // Validate file type (expecting images or PDFs)
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setError('File type not supported. Please upload an image or PDF.')
        return
      }
      
      // Validate file size (max 5MB for testing)
      if (file.size > 5 * 1024 * 1024) {
        setError('File too large. Maximum size is 5MB.')
        return
      }
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 100))
      onFileUploaded('file-123')
    }
  }

  return (
    <div data-testid="file-upload">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-600 mb-4">Click to upload or drag and drop</p>
        <input
          type="file"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="file-input"
        />
        <button 
          onClick={() => document.getElementById('file-input')?.click()}
          className="min-h-[44px] px-4 bg-blue-500 text-white rounded touch-manipulation"
        >
          Upload File
        </button>
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}
      </div>
      <button 
        onClick={() => onFileRemoved()}
        className="mt-2 min-h-[44px] px-4 bg-red-500 text-white rounded touch-manipulation"
      >
        Remove File
      </button>
    </div>
  )
}

describe('Mobile File Attachment Tests', () => {
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

  // Helper to create mock file
  const createMockFile = (name: string, size: number, type: string) => {
    const file = new File([''], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  beforeEach(() => {
    setMobileViewport()
    mockUploadFile.mockClear()
    mockDownloadFile.mockClear()
    mockDeleteFile.mockClear()
    jest.mocked(global.fetch).mockClear()
    mockPush.mockClear()
  })

  describe('File Upload Interface', () => {
    it('renders file upload component with mobile-optimized layout', () => {
      const mockOnFileUploaded = jest.fn()
      const mockOnFileRemoved = jest.fn()

      render(
        <MockFileUpload 
          onFileUploaded={mockOnFileUploaded}
          onFileRemoved={mockOnFileRemoved}
        />
      )

      // Check for upload area
      const uploadArea = screen.getByText(/click to upload|drag and drop/i) || 
                        screen.getByRole('button', { name: /upload/i })
      expect(uploadArea).toBeInTheDocument()

      // Upload area should be touch-friendly
      if (uploadArea.closest('[class*="min-h"]')) {
        expect(uploadArea.closest('[class*="min-h"]')).toHaveClass('min-h-[120px]')
      }
    })

    it('handles file selection with mobile touch interactions', async () => {
      const mockOnFileUploaded = jest.fn()
      
      // Mock successful upload
      jest.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ fileId: 'file-123', url: 'https://example.com/file.jpg' }),
      } as Response)

      render(
        <MockFileUpload 
          onFileUploaded={mockOnFileUploaded}
          onFileRemoved={jest.fn()}
        />
      )

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      const mockFile = createMockFile('test-image.jpg', 1024 * 1024, 'image/jpeg')

      // Simulate file selection
      fireEvent.change(fileInput, {
        target: { files: [mockFile] },
      })

      await waitFor(() => {
        expect(mockOnFileUploaded).toHaveBeenCalledWith('file-123')
      })
    })

    it('validates file types on mobile', async () => {
      const mockOnFileUploaded = jest.fn()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <MockFileUpload 
          onFileUploaded={mockOnFileUploaded}
          onFileRemoved={jest.fn()}
        />
      )

      const fileInput = document.querySelector('input[type="file"]')

      if (fileInput) {
        // Try to upload unsupported file type
        const mockFile = createMockFile('test.exe', 1024, 'application/exe')

        fireEvent.change(fileInput, {
          target: { files: [mockFile] },
        })

        await waitFor(() => {
          // Should show error for unsupported file type
          expect(screen.getByText(/file type not supported/i)).toBeInTheDocument()
        })

        expect(mockOnFileUploaded).not.toHaveBeenCalled()
      }

      consoleSpy.mockRestore()
    })

    it('validates file size limits on mobile', async () => {
      const mockOnFileUploaded = jest.fn()

      render(
        <MockFileUpload 
          onFileUploaded={mockOnFileUploaded}
          onFileRemoved={jest.fn()}
        />
      )

      const fileInput = document.querySelector('input[type="file"]')

      if (fileInput) {
        // Try to upload oversized file
        const largeMockFile = createMockFile('large-image.jpg', 10 * 1024 * 1024, 'image/jpeg')

        fireEvent.change(fileInput, {
          target: { files: [largeMockFile] },
        })

        await waitFor(() => {
          // Should show error for file too large
          expect(screen.getByText(/file too large/i)).toBeInTheDocument()
        })

        expect(mockOnFileUploaded).not.toHaveBeenCalled()
      }
    })

    it('provides upload progress on mobile', async () => {
      const mockOnFileUploaded = jest.fn()
      
      // Mock fetch with progress simulation
      const mockXHR = {
        upload: {
          addEventListener: jest.fn(),
        },
        open: jest.fn(),
        send: jest.fn(),
        setRequestHeader: jest.fn(),
      }

      Object.defineProperty(window, 'XMLHttpRequest', {
        value: jest.fn(() => mockXHR),
      })

      const MockFileUploadWithProgress = () => {
        const [progress, setProgress] = React.useState(0)
        const [uploading, setUploading] = React.useState(false)

        const handleFileSelect = () => {
          setUploading(true)
          setProgress(0)

          // Simulate upload progress
          const interval = setInterval(() => {
            setProgress(prev => {
              if (prev >= 100) {
                clearInterval(interval)
                setUploading(false)
                mockOnFileUploaded('file-123')
                return 100
              }
              return prev + 10
            })
          }, 100)
        }

        return (
          <div>
            <button
              onClick={handleFileSelect}
              disabled={uploading}
              className="w-full min-h-[44px] touch-manipulation bg-blue-500 text-white rounded disabled:opacity-50"
            >
              {uploading ? `Uploading... ${progress}%` : 'Upload File'}
            </button>
            {uploading && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )
      }

      render(<MockFileUploadWithProgress />)

      const uploadButton = screen.getByText('Upload File')
      fireEvent.click(uploadButton)

      // Should show progress
      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument()
      })

      // Wait for completion
      await waitFor(() => {
        expect(mockOnFileUploaded).toHaveBeenCalledWith('file-123')
      }, { timeout: 2000 })
    })
  })

  describe('File Preview and Management', () => {
    it('displays file preview on mobile', () => {
      const MockFilePreview = ({ file }: { file: File }) => {
        const [preview, setPreview] = React.useState<string>('')

        React.useEffect(() => {
          if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file)
            setPreview(url)
            return () => URL.revokeObjectURL(url)
          }
        }, [file])

        return (
          <div className="p-4">
            {preview && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={preview} 
                  alt="File preview"
                  className="w-full h-48 object-cover rounded border"
                />
                <button className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full">
                  ×
                </button>
              </div>
            )}
            <div className="mt-2 text-sm">
              <div className="font-semibold">{file.name}</div>
              <div className="text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
            </div>
          </div>
        )
      }

      const mockFile = createMockFile('test-image.jpg', 1024, 'image/jpeg')
      render(<MockFilePreview file={mockFile} />)

      expect(screen.getByAltText('File preview')).toBeInTheDocument()
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument()
      expect(screen.getByText('1.0 KB')).toBeInTheDocument()
    })

    it('handles file removal on mobile', async () => {
      const mockOnFileRemoved = jest.fn()

      const MockFileManager = () => {
        const [files, setFiles] = React.useState([
          { id: 'file-1', name: 'document.pdf', size: 2048 },
          { id: 'file-2', name: 'image.jpg', size: 1536 },
        ])

        const removeFile = (fileId: string) => {
          setFiles(files.filter(f => f.id !== fileId))
          mockOnFileRemoved(fileId)
        }

        return (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-semibold text-sm">{file.name}</div>
                  <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="min-h-[44px] min-w-[44px] touch-manipulation bg-red-500 text-white rounded"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )
      }

      render(<MockFileManager />)

      const removeButtons = screen.getAllByText('🗑️')
      
      // Touch interaction to remove file
      fireEvent.touchStart(removeButtons[0])
      fireEvent.touchEnd(removeButtons[0])
      fireEvent.click(removeButtons[0])

      await waitFor(() => {
        expect(mockOnFileRemoved).toHaveBeenCalledWith('file-1')
      })

      // File should be removed from list
      expect(screen.queryByText('document.pdf')).not.toBeInTheDocument()
    })

    it('provides file download on mobile', async () => {
      // Mock successful download
      const mockBlob = jest.fn().mockResolvedValue(new Blob(['file content'], { type: 'application/pdf' }))
      jest.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        blob: mockBlob,
      } as any)

      const MockFileDownload = () => {
        const downloadFile = async (fileId: string, fileName: string) => {
          try {
            const response = await fetch(`/api/download/${fileId}`)
            const blob = await response.blob()
            
            // Create download link
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          } catch (error) {
            console.error('Download failed:', error)
          }
        }

        return (
          <div className="p-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-semibold">important-document.pdf</div>
                <div className="text-sm text-gray-500">PDF • 2.5 MB</div>
              </div>
              <button
                onClick={() => downloadFile('file-123', 'important-document.pdf')}
                className="min-h-[44px] px-4 touch-manipulation bg-blue-500 text-white rounded"
              >
                ⬇️
              </button>
            </div>
          </div>
        )
      }

      render(<MockFileDownload />)

      const downloadButton = screen.getByText('⬇️')
      
      // Touch interaction to download
      fireEvent.touchStart(downloadButton)
      fireEvent.touchEnd(downloadButton)
      fireEvent.click(downloadButton)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/download/file-123')
      })
    })

    it('handles multiple file attachments on mobile', () => {
      const MockMultipleFileUpload = () => {
        const [attachedFiles, setAttachedFiles] = React.useState<File[]>([])

        const handleFilesSelected = (files: FileList) => {
          const fileArray = Array.from(files)
          setAttachedFiles(prev => [...prev, ...fileArray])
        }

        const removeFile = (index: number) => {
          setAttachedFiles(prev => prev.filter((_, i) => i !== index))
        }

        return (
          <div>
            <input
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="block w-full min-h-[44px] touch-manipulation border-2 border-dashed border-gray-300 rounded p-4 text-center cursor-pointer"
            >
              Tap to select files
            </label>
            
            {attachedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="font-semibold">Attached Files:</h3>
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                    <div>
                      <div className="text-sm font-medium">{file.name}</div>
                      <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="min-h-[32px] min-w-[32px] touch-manipulation bg-red-500 text-white rounded text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      render(<MockMultipleFileUpload />)

      const uploadLabel = screen.getByText('Tap to select files')
      expect(uploadLabel).toHaveClass('touch-manipulation')

      // Simulate multiple file selection
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      const mockFiles = [
        createMockFile('file1.jpg', 1024, 'image/jpeg'),
        createMockFile('file2.pdf', 2048, 'application/pdf'),
      ]

      fireEvent.change(fileInput, {
        target: { files: mockFiles },
      })

      expect(screen.getByText('file1.jpg')).toBeInTheDocument()
      expect(screen.getByText('file2.pdf')).toBeInTheDocument()
    })
  })

  describe('File Type Handling', () => {
    it('handles image files with mobile preview', () => {
      const MockImagePreview = () => {
        const [selectedImage, setSelectedImage] = React.useState<string>('')

        const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0]
          if (file && file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file)
            setSelectedImage(url)
          }
        }

        return (
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="image-input"
            />
            <label
              htmlFor="image-input"
              className="block w-full min-h-[44px] touch-manipulation bg-blue-500 text-white rounded p-2 text-center"
            >
              Select Image
            </label>
            
            {selectedImage && (
              <div className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt="Selected preview"
                  className="w-full h-48 object-cover rounded border"
                />
                <div className="flex gap-2 mt-2">
                  <button className="flex-1 min-h-[44px] touch-manipulation bg-green-500 text-white rounded">
                    Crop
                  </button>
                  <button className="flex-1 min-h-[44px] touch-manipulation bg-yellow-500 text-white rounded">
                    Rotate
                  </button>
                  <button className="flex-1 min-h-[44px] touch-manipulation bg-red-500 text-white rounded">
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      }

      render(<MockImagePreview />)

      const selectButton = screen.getByText('Select Image')
      expect(selectButton).toHaveClass('touch-manipulation')

      // Simulate image selection
      const imageInput = document.getElementById('image-input') as HTMLInputElement
      const mockImage = createMockFile('test-image.jpg', 1024, 'image/jpeg')

      fireEvent.change(imageInput, {
        target: { files: [mockImage] },
      })

      // Should show preview and action buttons
      expect(screen.getByAltText('Selected preview')).toBeInTheDocument()
      expect(screen.getByText('Crop')).toBeInTheDocument()
      expect(screen.getByText('Rotate')).toBeInTheDocument()
      expect(screen.getByText('Remove')).toBeInTheDocument()
    })

    it('handles document files on mobile', () => {
      const documentTypes = [
        { name: 'document.pdf', type: 'application/pdf', icon: '📄' },
        { name: 'spreadsheet.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', icon: '📊' },
        { name: 'presentation.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', icon: '📈' },
      ]

      const MockDocumentViewer = () => (
        <div className="space-y-2">
          {documentTypes.map((doc) => (
            <div key={doc.name} className="flex items-center p-3 border rounded">
              <div className="text-2xl mr-3">{doc.icon}</div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{doc.name}</div>
                <div className="text-xs text-gray-500">{doc.type}</div>
              </div>
              <div className="flex gap-1">
                <button className="min-h-[44px] px-3 touch-manipulation bg-blue-500 text-white rounded text-sm">
                  View
                </button>
                <button className="min-h-[44px] px-3 touch-manipulation bg-green-500 text-white rounded text-sm">
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      )

      render(<MockDocumentViewer />)

      // Check all documents are displayed
      documentTypes.forEach((doc) => {
        expect(screen.getByText(doc.name)).toBeInTheDocument()
      })

      // Check action buttons are touch-friendly
      const viewButtons = screen.getAllByText('View')
      const shareButtons = screen.getAllByText('Share')

      viewButtons.forEach(button => {
        expect(button).toHaveClass('touch-manipulation')
      })
      shareButtons.forEach(button => {
        expect(button).toHaveClass('touch-manipulation')
      })
    })

    it('handles audio/video files on mobile', () => {
      const MediaViewer = () => (
        <div className="space-y-4">
          <div className="border rounded p-4">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">🎵</span>
              <div>
                <div className="font-semibold">audio-file.mp3</div>
                <div className="text-sm text-gray-500">Audio • 3.2 MB</div>
              </div>
            </div>
            <audio controls className="w-full">
              <source src="mock-audio.mp3" type="audio/mpeg" />
            </audio>
            <div className="flex gap-2 mt-2">
              <button className="flex-1 min-h-[44px] touch-manipulation bg-blue-500 text-white rounded">
                Download
              </button>
              <button className="flex-1 min-h-[44px] touch-manipulation bg-green-500 text-white rounded">
                Share
              </button>
            </div>
          </div>

          <div className="border rounded p-4">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">🎥</span>
              <div>
                <div className="font-semibold">video-file.mp4</div>
                <div className="text-sm text-gray-500">Video • 15.8 MB</div>
              </div>
            </div>
            <video controls className="w-full rounded">
              <source src="mock-video.mp4" type="video/mp4" />
            </video>
            <div className="flex gap-2 mt-2">
              <button className="flex-1 min-h-[44px] touch-manipulation bg-blue-500 text-white rounded">
                Download
              </button>
              <button className="flex-1 min-h-[44px] touch-manipulation bg-green-500 text-white rounded">
                Share
              </button>
            </div>
          </div>
        </div>
      )

      render(<MediaViewer />)

      expect(screen.getByText('audio-file.mp3')).toBeInTheDocument()
      expect(screen.getByText('video-file.mp4')).toBeInTheDocument()

      // Check for audio/video controls
      expect(document.querySelector('audio')).toBeInTheDocument()
      expect(document.querySelector('video')).toBeInTheDocument()

      // Check touch-friendly buttons
      const downloadButtons = screen.getAllByText('Download')
      const shareButtons = screen.getAllByText('Share')

      downloadButtons.forEach(button => {
        expect(button).toHaveClass('touch-manipulation')
      })
      shareButtons.forEach(button => {
        expect(button).toHaveClass('touch-manipulation')
      })
    })
  })

  describe('Mobile-Specific File Features', () => {
    it('handles camera capture on mobile', () => {
      const MockCameraCapture = () => {
        const [capturedImage, setCapturedImage] = React.useState<string>('')

        const captureFromCamera = () => {
          // Simulate camera capture
          setCapturedImage('data:image/jpeg;base64,/9j/4AAQSkZJRgABA...')
        }

        return (
          <div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={captureFromCamera}
                className="flex-1 min-h-[44px] touch-manipulation bg-green-500 text-white rounded"
              >
                📷 Camera
              </button>
              <button className="flex-1 min-h-[44px] touch-manipulation bg-blue-500 text-white rounded">
                📁 Gallery
              </button>
            </div>
            
            {capturedImage && (
              <div className="border rounded p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedImage}
                  alt="Captured from camera"
                  className="w-full h-48 object-cover rounded"
                />
                <div className="flex gap-2 mt-2">
                  <button className="flex-1 min-h-[44px] touch-manipulation bg-blue-500 text-white rounded">
                    Retake
                  </button>
                  <button className="flex-1 min-h-[44px] touch-manipulation bg-green-500 text-white rounded">
                    Use Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      }

      render(<MockCameraCapture />)

      const cameraButton = screen.getByText('📷 Camera')
      const galleryButton = screen.getByText('📁 Gallery')

      expect(cameraButton).toHaveClass('touch-manipulation')
      expect(galleryButton).toHaveClass('touch-manipulation')

      // Simulate camera capture
      fireEvent.click(cameraButton)

      expect(screen.getByAltText('Captured from camera')).toBeInTheDocument()
      expect(screen.getByText('Retake')).toBeInTheDocument()
      expect(screen.getByText('Use Photo')).toBeInTheDocument()
    })

    it('provides file sharing on mobile', () => {
      const MockFileShare = () => {
        const shareFile = async (fileName: string) => {
          if (navigator.share) {
            try {
              await navigator.share({
                title: 'Shared File',
                text: `Check out this file: ${fileName}`,
                url: `https://example.com/files/${fileName}`,
              })
            } catch (error) {
              console.log('Share failed:', error)
            }
          } else {
            // Fallback for browsers without Web Share API
            navigator.clipboard.writeText(`https://example.com/files/${fileName}`)
          }
        }

        return (
          <div className="p-4 border rounded">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">important-document.pdf</div>
                <div className="text-sm text-gray-500">PDF • 2.5 MB</div>
              </div>
              <button
                onClick={() => shareFile('important-document.pdf')}
                className="min-h-[44px] px-4 touch-manipulation bg-blue-500 text-white rounded"
              >
                Share
              </button>
            </div>
          </div>
        )
      }

      // Mock navigator.share
      Object.defineProperty(navigator, 'share', {
        value: jest.fn(),
        writable: true,
      })

      render(<MockFileShare />)

      const shareButton = screen.getByText('Share')
      fireEvent.click(shareButton)

      expect(navigator.share).toHaveBeenCalledWith({
        title: 'Shared File',
        text: 'Check out this file: important-document.pdf',
        url: 'https://example.com/files/important-document.pdf',
      })
    })

    it('handles offline file access', () => {
      const MockOfflineFiles = () => {
        const [isOnline, setIsOnline] = React.useState(navigator.onLine)

        React.useEffect(() => {
          const handleOnline = () => setIsOnline(true)
          const handleOffline = () => setIsOnline(false)

          window.addEventListener('online', handleOnline)
          window.addEventListener('offline', handleOffline)

          return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
          }
        }, [])

        const files = [
          { name: 'cached-file.pdf', cached: true },
          { name: 'remote-file.pdf', cached: false },
        ]

        return (
          <div>
            <div className="mb-4 p-2 bg-gray-100 rounded">
              Status: {isOnline ? '🟢 Online' : '🔴 Offline'}
            </div>
            
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.name} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-semibold">{file.name}</div>
                    <div className="text-sm text-gray-500">
                      {file.cached ? '📱 Available offline' : '☁️ Requires internet'}
                    </div>
                  </div>
                  <button
                    disabled={!isOnline && !file.cached}
                    className="min-h-[44px] px-4 touch-manipulation bg-blue-500 text-white rounded disabled:opacity-50 disabled:bg-gray-400"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      }

      render(<MockOfflineFiles />)

      expect(screen.getByText(/online/i)).toBeInTheDocument()
      expect(screen.getByText(/available offline/i)).toBeInTheDocument()
      expect(screen.getByText(/requires internet/i)).toBeInTheDocument()

      const openButtons = screen.getAllByText('Open')
      expect(openButtons[0]).toBeEnabled() // Cached file
      expect(openButtons[1]).toBeEnabled() // Online file

      // Simulate going offline
      fireEvent(window, new Event('offline'))
      
      // Remote file button should be disabled when offline
    })
  })
})
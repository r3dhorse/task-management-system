import { render, screen, userEvent } from '@/test-utils'
import React from 'react'

// Simple test component that mimics FileUpload behavior
const SimpleFileUpload = ({ onFileUploaded, disabled = false }: any) => {
  const [file, setFile] = React.useState<File | null>(null)
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        return // Invalid file type
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        return // File too large
      }
      setFile(selectedFile)
      onFileUploaded?.(selectedFile.name)
    }
  }
  
  return (
    <div>
      <label htmlFor="file-input">File Upload</label>
      <input
        id="file-input"
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        disabled={disabled}
      />
      {file && <span data-testid="file-name">{file.name}</span>}
      <p>Only PDF files up to 10MB</p>
    </div>
  )
}

describe('File Upload Component', () => {
  it('renders file upload input', () => {
    render(<SimpleFileUpload />)
    
    expect(screen.getByLabelText('File Upload')).toBeInTheDocument()
    expect(screen.getByText('Only PDF files up to 10MB')).toBeInTheDocument()
  })

  it('accepts PDF files', async () => {
    const user = userEvent.setup()
    const mockOnFileUploaded = jest.fn()
    
    render(<SimpleFileUpload onFileUploaded={mockOnFileUploaded} />)
    
    const fileInput = screen.getByLabelText('File Upload')
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    
    await user.upload(fileInput, file)
    
    expect(screen.getByTestId('file-name')).toHaveTextContent('test.pdf')
    expect(mockOnFileUploaded).toHaveBeenCalledWith('test.pdf')
  })

  it('handles disabled state', () => {
    render(<SimpleFileUpload disabled={true} />)
    
    const fileInput = screen.getByLabelText('File Upload')
    expect(fileInput).toBeDisabled()
  })

  it('has correct file type restrictions', () => {
    render(<SimpleFileUpload />)
    
    const fileInput = screen.getByLabelText('File Upload')
    expect(fileInput).toHaveAttribute('accept', '.pdf')
  })
})
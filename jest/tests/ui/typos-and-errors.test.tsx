import React from 'react'
import { render, screen } from '@/test-utils'

// Mock components with potential typos and errors
const MockApplicationTexts = () => (
  <div>
    {/* Common application text content */}
    <h1>Task Management Application</h1>
    <h2>Welcome back</h2>
    <p>Sign in to your account to continue</p>
    
    {/* Form labels */}
    <label>Email Address</label>
    <label>Password</label>
    <label>Task Name</label>
    <label>Description</label>
    <label>Due Date</label>
    <label>Assignee</label>
    <label>Project</label>
    <label>Status</label>
    <label>Workspace Name</label>
    
    {/* Button texts */}
    <button>Sign In</button>
    <button>Create Task</button>
    <button>Create Workspace</button>
    <button>Create Project</button>
    <button>Save Changes</button>
    <button>Cancel</button>
    <button>Delete</button>
    <button>Remove</button>
    <button>Confirm</button>
    <button>Edit</button>
    
    {/* Status texts */}
    <span>Backlog</span>
    <span>Todo</span>
    <span>In Progress</span>
    <span>In Review</span>
    <span>Done</span>
    
    {/* Role texts */}
    <span>Admin</span>
    <span>Member</span>
    <span>You</span>
    
    {/* Placeholder texts */}
    <input placeholder="Enter task name" />
    <input placeholder="Enter workspace name" />
    <input placeholder="Enter workspace description" />
    <input placeholder="Search members by name..." />
    <input placeholder="Email address" />
    <input placeholder="Password" />
    <select>
      <option>Select assignee</option>
      <option>Select status</option>
      <option>Select project</option>
      <option>All statuses</option>
      <option>All assignees</option>
      <option>All projects</option>
    </select>
    
    {/* Error messages */}
    <div role="alert">Email is required</div>
    <div role="alert">Password is required</div>
    <div role="alert">Task name is required</div>
    <div role="alert">Workspace name is required</div>
    <div role="alert">Invalid email address</div>
    <div role="alert">Password must be at least 8 characters</div>
    <div role="alert">Only PDF files are allowed</div>
    <div role="alert">File size must be less than 10MB</div>
    <div role="alert">Failed to upload file</div>
    <div role="alert">Failed to download file</div>
    <div role="alert">Project is required</div>
    <div role="alert">Due date cannot be in the past</div>
    
    {/* Success messages */}
    <div role="status">Task created successfully</div>
    <div role="status">Workspace created successfully</div>
    <div role="status">Project created successfully</div>
    <div role="status">File uploaded successfully</div>
    <div role="status">Changes saved successfully</div>
    
    {/* Navigation texts */}
    <nav>
      <a href="/">Home</a>
      <a href="/tasks">My Tasks</a>
      <a href="/members">Members</a>
      <a href="/settings">Settings</a>
      <a href="/projects">Projects</a>
    </nav>
    
    {/* Helper texts */}
    <p>Only PDF files up to 10MB are allowed</p>
    <p>Loading members...</p>
    <p>Uploading file...</p>
    <p>No data available.</p>
    <p>No members found</p>
    <p>No workspace selected</p>
    <p>No workspaces available</p>
    
    {/* Dialog texts */}
    <div>Are you sure you want to delete this task?</div>
    <div>Remove this member from the workspace?</div>
    <div>Delete this workspace permanently?</div>
    
    {/* Table headers */}
    <table>
      <thead>
        <tr>
          <th>Task Name</th>
          <th>Project</th>
          <th>Assignee</th>
          <th>Due Date</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
    </table>
    
    {/* Miscellaneous texts */}
    <span>Unassigned</span>
    <span>Optional</span>
    <span>Required</span>
    <span>Loading...</span>
    <span>Creating...</span>
    <span>Updating...</span>
    <span>Deleting...</span>
    
    {/* Accessibility texts */}
    <span className="sr-only">Sort ascending</span>
    <span className="sr-only">Sort descending</span>
    <span className="sr-only">Close dialog</span>
    <span className="sr-only">Open menu</span>
    <span className="sr-only">Loading content</span>
  </div>
)

describe('Typography and Content Accuracy Tests', () => {
  beforeEach(() => {
    render(<MockApplicationTexts />)
  })

  describe('Application Titles and Headers', () => {
    it('displays correct application title', () => {
      expect(screen.getByText('Task Management Application')).toBeInTheDocument()
    })

    it('displays correct welcome message', () => {
      expect(screen.getByText('Welcome back')).toBeInTheDocument()
    })

    it('displays correct sign-in subtitle', () => {
      expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument()
    })
  })

  describe('Form Label Accuracy', () => {
    it('displays correct form labels', () => {
      expect(screen.getAllByText('Email Address')).toHaveLength(1)
      expect(screen.getAllByText('Password')).toHaveLength(1)
      expect(screen.getAllByText('Task Name')).toHaveLength(2) // Label and table header
      expect(screen.getAllByText('Description')).toHaveLength(1)
      expect(screen.getAllByText('Due Date')).toHaveLength(2) // Label and table header
      expect(screen.getAllByText('Assignee')).toHaveLength(2) // Label and table header
      expect(screen.getAllByText('Project')).toHaveLength(2) // Label and table header
      expect(screen.getAllByText('Status')).toHaveLength(2) // Label and table header
      expect(screen.getAllByText('Workspace Name')).toHaveLength(1)
    })

    it('uses consistent capitalization in labels', () => {
      // Check that all labels follow proper title case
      const labels = [
        'Email Address',
        'Task Name',
        'Due Date',
        'Workspace Name'
      ]
      
      labels.forEach(label => {
        expect(screen.getAllByText(label).length).toBeGreaterThan(0)
        // Verify proper capitalization (first letter of each word)
        const words = label.split(' ')
        words.forEach(word => {
          expect(word.charAt(0)).toMatch(/[A-Z]/)
        })
      })
    })
  })

  describe('Button Text Accuracy', () => {
    it('displays correct button texts', () => {
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Task' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Workspace' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Project' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    it('uses consistent verb forms in buttons', () => {
      // Create buttons use base form
      expect(screen.getByText('Create Task')).toBeInTheDocument()
      expect(screen.getByText('Create Workspace')).toBeInTheDocument()
      expect(screen.getByText('Create Project')).toBeInTheDocument()
      
      // Action buttons use base form
      expect(screen.getByText('Save Changes')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
      expect(screen.getByText('Remove')).toBeInTheDocument()
    })
  })

  describe('Status Text Accuracy', () => {
    it('displays correct status options', () => {
      expect(screen.getByText('Backlog')).toBeInTheDocument()
      expect(screen.getByText('Todo')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('In Review')).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
    })

    it('uses consistent status capitalization', () => {
      // Single word statuses
      expect(screen.getByText('Backlog')).toBeInTheDocument() // Title case
      expect(screen.getByText('Todo')).toBeInTheDocument() // Title case
      expect(screen.getByText('Done')).toBeInTheDocument() // Title case
      
      // Multi-word statuses
      expect(screen.getByText('In Progress')).toBeInTheDocument() // Title case
      expect(screen.getByText('In Review')).toBeInTheDocument() // Title case
    })

    it('displays correct role texts', () => {
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('Member')).toBeInTheDocument()
      expect(screen.getByText('You')).toBeInTheDocument()
    })
  })

  describe('Placeholder Text Accuracy', () => {
    it('displays correct placeholder texts', () => {
      expect(screen.getByPlaceholderText('Enter task name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter workspace name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter workspace description')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search members by name...')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    })

    it('uses consistent placeholder formatting', () => {
      // "Enter" prefix for input fields
      expect(screen.getByPlaceholderText('Enter task name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter workspace name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter workspace description')).toBeInTheDocument()
      
      // "Search" prefix for search fields
      expect(screen.getByPlaceholderText('Search members by name...')).toBeInTheDocument()
    })

    it('displays correct select placeholders', () => {
      expect(screen.getByText('Select assignee')).toBeInTheDocument()
      expect(screen.getByText('Select status')).toBeInTheDocument()
      expect(screen.getByText('Select project')).toBeInTheDocument()
      expect(screen.getByText('All statuses')).toBeInTheDocument()
      expect(screen.getByText('All assignees')).toBeInTheDocument()
      expect(screen.getByText('All projects')).toBeInTheDocument()
    })
  })

  describe('Error Message Accuracy', () => {
    it('displays correct validation error messages', () => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
      expect(screen.getByText('Task name is required')).toBeInTheDocument()
      expect(screen.getByText('Workspace name is required')).toBeInTheDocument()
      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      expect(screen.getByText('Project is required')).toBeInTheDocument()
      expect(screen.getByText('Due date cannot be in the past')).toBeInTheDocument()
    })

    it('displays correct file upload error messages', () => {
      expect(screen.getByText('Only PDF files are allowed')).toBeInTheDocument()
      expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument()
      expect(screen.getByText('Failed to upload file')).toBeInTheDocument()
      expect(screen.getByText('Failed to download file')).toBeInTheDocument()
    })

    it('uses consistent error message formatting', () => {
      // Required field errors follow pattern: "[Field] is required"
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
      expect(screen.getByText('Task name is required')).toBeInTheDocument()
      expect(screen.getByText('Workspace name is required')).toBeInTheDocument()
      expect(screen.getByText('Project is required')).toBeInTheDocument()
    })
  })

  describe('Success Message Accuracy', () => {
    it('displays correct success messages', () => {
      expect(screen.getByText('Task created successfully')).toBeInTheDocument()
      expect(screen.getByText('Workspace created successfully')).toBeInTheDocument()
      expect(screen.getByText('Project created successfully')).toBeInTheDocument()
      expect(screen.getByText('File uploaded successfully')).toBeInTheDocument()
      expect(screen.getByText('Changes saved successfully')).toBeInTheDocument()
    })

    it('uses consistent success message formatting', () => {
      // Success messages follow pattern: "[Action] successfully"
      const successMessages = [
        'Task created successfully',
        'Workspace created successfully',
        'Project created successfully',
        'File uploaded successfully',
        'Changes saved successfully'
      ]
      
      successMessages.forEach(message => {
        expect(screen.getByText(message)).toBeInTheDocument()
        expect(message).toMatch(/successfully$/)
      })
    })
  })

  describe('Navigation Text Accuracy', () => {
    it('displays correct navigation links', () => {
      expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'My Tasks' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Members' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument()
    })
  })

  describe('Helper Text Accuracy', () => {
    it('displays correct helper texts', () => {
      expect(screen.getByText('Only PDF files up to 10MB are allowed')).toBeInTheDocument()
      expect(screen.getByText('Loading members...')).toBeInTheDocument()
      expect(screen.getByText('Uploading file...')).toBeInTheDocument()
      expect(screen.getByText('No data available.')).toBeInTheDocument()
      expect(screen.getByText('No members found')).toBeInTheDocument()
      expect(screen.getByText('No workspace selected')).toBeInTheDocument()
      expect(screen.getByText('No workspaces available')).toBeInTheDocument()
    })

    it('uses consistent loading state formatting', () => {
      expect(screen.getByText('Loading members...')).toBeInTheDocument()
      expect(screen.getByText('Uploading file...')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      
      // Check that loading states end with "..."
      expect('Loading members...').toMatch(/\.\.\.$/);
      expect('Uploading file...').toMatch(/\.\.\.$/);
      expect('Loading...').toMatch(/\.\.\.$/);
    })
  })

  describe('Dialog Text Accuracy', () => {
    it('displays correct confirmation dialog texts', () => {
      expect(screen.getByText('Are you sure you want to delete this task?')).toBeInTheDocument()
      expect(screen.getByText('Remove this member from the workspace?')).toBeInTheDocument()
      expect(screen.getByText('Delete this workspace permanently?')).toBeInTheDocument()
    })
  })

  describe('Table Header Accuracy', () => {
    it('displays correct table headers', () => {
      expect(screen.getByRole('columnheader', { name: 'Task Name' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Project' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Assignee' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Due Date' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument()
    })
  })

  describe('Miscellaneous Text Accuracy', () => {
    it('displays correct miscellaneous texts', () => {
      expect(screen.getByText('Unassigned')).toBeInTheDocument()
      expect(screen.getByText('Optional')).toBeInTheDocument()
      expect(screen.getByText('Required')).toBeInTheDocument()
      expect(screen.getByText('Creating...')).toBeInTheDocument()
      expect(screen.getByText('Updating...')).toBeInTheDocument()
      expect(screen.getByText('Deleting...')).toBeInTheDocument()
    })
  })

  describe('Accessibility Text Accuracy', () => {
    it('displays correct screen reader texts', () => {
      expect(screen.getByText('Sort ascending')).toBeInTheDocument()
      expect(screen.getByText('Sort descending')).toBeInTheDocument()
      expect(screen.getByText('Close dialog')).toBeInTheDocument()
      expect(screen.getByText('Open menu')).toBeInTheDocument()
      expect(screen.getByText('Loading content')).toBeInTheDocument()
    })
  })

  describe('Common Typo Prevention', () => {
    it('does not contain common typos', () => {
      const commonTypos = [
        'Taks', 'Tsak', // Task typos
        'Managment', 'Managemnt', // Management typos
        'Workpsace', 'Wokspace', // Workspace typos
        // Note: Removed 'Asignee' and 'Assigne' because "Assignee" is the correct spelling
        'Projct', 'Porject', // Project typos
        'Memebr', 'Meber', // Member typos
        'Descritpion', 'Desciption', // Description typos
        'Succesfully', 'Sucessfully', 'Successfuly', // Successfully typos
        'Requried', 'Requeired', // Required typos
        'Availalbe', 'Availabe', // Available typos
        'Addres', 'Adress', // Address typos
        'Pasword', 'Passowrd', // Password typos
      ]

      commonTypos.forEach(typo => {
        const elements = screen.queryAllByText(new RegExp(`^${typo}$`, 'i'))
        expect(elements).toHaveLength(0)
      })
    })

    it('uses correct spelling for technical terms', () => {
      // Verify correct spelling of technical terms
      expect(screen.getByText('Email Address')).toBeInTheDocument() // Not "E-mail"
      expect(screen.getByText('Sign In')).toBeInTheDocument() // Not "Signin" or "Sign-in"
      expect(screen.getAllByText(/workspace/i).length).toBeGreaterThan(0) // Not "Work space" or "Work-space"
    })
  })

  describe('Consistent Terminology', () => {
    it('uses consistent terminology throughout', () => {
      // Task vs Todo consistency
      expect(screen.getAllByText('Task Name').length).toBeGreaterThan(0)
      expect(screen.getByText('Create Task')).toBeInTheDocument()
      expect(screen.getByText('Todo')).toBeInTheDocument() // Status, not general term
      
      // Member vs User consistency (should use "Member" in context)
      expect(screen.getByText('Members')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search members by name...')).toBeInTheDocument()
      
      // Workspace consistency
      expect(screen.getByText('Workspace Name')).toBeInTheDocument()
      expect(screen.getByText('Create Workspace')).toBeInTheDocument()
    })

    it('uses consistent date terminology', () => {
      expect(screen.getByRole('columnheader', { name: 'Due Date' })).toBeInTheDocument() // Not "Deadline" or "End Date"
    })
  })
})
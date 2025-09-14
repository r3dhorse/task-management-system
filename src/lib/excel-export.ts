import * as XLSX from 'xlsx';
import { TaskStatus } from '@/features/tasks/types';

export interface ExportTask {
  id: string;
  taskNumber: string;
  name: string;
  description?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  serviceName?: string;
  assigneeName?: string;
  creatorName?: string;
  isConfidential?: boolean;
}

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString || '';
  }
};

const formatStatus = (status: TaskStatus): string => {
  switch (status) {
    case TaskStatus.BACKLOG:
      return 'Backlog';
    case TaskStatus.TODO:
      return 'To Do';
    case TaskStatus.IN_PROGRESS:
      return 'In Progress';
    case TaskStatus.IN_REVIEW:
      return 'In Review';
    case TaskStatus.DONE:
      return 'Done';
    case TaskStatus.ARCHIVED:
      return 'Archived';
    default:
      return status;
  }
};

export const exportTasksToExcel = (
  tasks: ExportTask[],
  workspaceName: string = 'Workspace',
  userName: string = 'Unknown User'
): void => {
  // Prepare data for Excel export
  const excelData = tasks.map(task => ({
    'Task Number': task.taskNumber || `Task #${task.id.slice(-7)}`,
    'Task Name': task.name,
    'Description': task.description || '',
    'Status': formatStatus(task.status),
    'Service/Project': task.serviceName || '',
    'Assignee': task.assigneeName || 'Unassigned',
    'Creator': task.creatorName || '',
    'Due Date': task.dueDate ? formatDate(task.dueDate) : '',
    'Created Date': formatDate(task.createdAt),
    'Updated Date': formatDate(task.updatedAt),
    'Confidential': task.isConfidential ? 'Yes' : 'No'
  }));

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Add footer with extraction info
  const currentDate = new Date();
  const extractionDate = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Calculate the row where footer should be placed (after data + 2 empty rows)
  const footerRow = excelData.length + 3;

  // Add footer information
  worksheet[`A${footerRow}`] = { t: 's', v: `Extracted on: ${extractionDate}` };
  worksheet[`A${footerRow + 1}`] = { t: 's', v: `Extracted by: ${userName}` };
  worksheet[`A${footerRow + 2}`] = { t: 's', v: `Total tasks: ${tasks.length}` };

  // Update the range to include footer
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  range.e.r = Math.max(range.e.r, footerRow + 2);
  worksheet['!ref'] = XLSX.utils.encode_range(range);

  // Set column widths for better readability
  const columnWidths = [
    { wch: 15 }, // Task Number
    { wch: 30 }, // Task Name
    { wch: 40 }, // Description
    { wch: 12 }, // Status
    { wch: 20 }, // Service/Project
    { wch: 20 }, // Assignee
    { wch: 20 }, // Creator
    { wch: 18 }, // Due Date
    { wch: 18 }, // Created Date
    { wch: 18 }, // Updated Date
    { wch: 12 }  // Confidential
  ];
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const filename = `${workspaceName}_Tasks_${timestamp}.xlsx`;

  // Write and download file
  XLSX.writeFile(workbook, filename);
};

// Note: The API endpoint handles the data transformation directly
// This transformer is kept for reference but not currently used
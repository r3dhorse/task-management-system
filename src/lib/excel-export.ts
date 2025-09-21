import ExcelJS from 'exceljs';
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

export const exportTasksToExcel = async (
  tasks: ExportTask[],
  _workspaceName: string = 'Workspace',
  userName: string = 'Unknown User'
): Promise<Buffer> => {
  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Tasks');

  // Define columns
  worksheet.columns = [
    { header: 'Task Number', key: 'taskNumber', width: 15 },
    { header: 'Task Name', key: 'taskName', width: 30 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Service/Project', key: 'service', width: 20 },
    { header: 'Assignee', key: 'assignee', width: 20 },
    { header: 'Creator', key: 'creator', width: 20 },
    { header: 'Due Date', key: 'dueDate', width: 18 },
    { header: 'Created Date', key: 'createdDate', width: 18 },
    { header: 'Updated Date', key: 'updatedDate', width: 18 },
    { header: 'Confidential', key: 'confidential', width: 12 }
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Add data
  tasks.forEach(task => {
    worksheet.addRow({
      taskNumber: task.taskNumber || `Task #${task.id.slice(-7)}`,
      taskName: task.name,
      description: task.description || '',
      status: formatStatus(task.status),
      service: task.serviceName || '',
      assignee: task.assigneeName || 'Unassigned',
      creator: task.creatorName || '',
      dueDate: task.dueDate ? formatDate(task.dueDate) : '',
      createdDate: formatDate(task.createdAt),
      updatedDate: formatDate(task.updatedAt),
      confidential: task.isConfidential ? 'Yes' : 'No'
    });
  });

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

  // Add empty row before footer
  worksheet.addRow({});

  // Add footer information
  const footerStartRow = tasks.length + 3;
  worksheet.addRow([`Extracted on: ${extractionDate}`]);
  worksheet.addRow([`Extracted by: ${userName}`]);
  worksheet.addRow([`Total tasks: ${tasks.length}`]);

  // Style footer
  worksheet.getRow(footerStartRow).font = { italic: true };
  worksheet.getRow(footerStartRow + 1).font = { italic: true };
  worksheet.getRow(footerStartRow + 2).font = { italic: true };

  // Generate and return buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

// Note: The API endpoint handles the data transformation directly
// This transformer is kept for reference but not currently used
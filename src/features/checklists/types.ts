export type Checklist = {
  id: string;
  serviceId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  items?: ChecklistItem[];
};

export type ChecklistItem = {
  id: string;
  checklistId: string;
  title: string;
  description?: string | null;
  order: number;
  requirePhoto: boolean;
  requireRemarks: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

// Status for checklist items in tasks
export type ChecklistItemStatus = 'pending' | 'passed' | 'failed';

// For task's JSON checklist field
export type TaskChecklistItem = {
  id: string;
  title: string;
  description?: string;
  order: number;
  requirePhoto?: boolean;
  requireRemarks?: boolean;
  status: ChecklistItemStatus;
  completedAt?: string;
  completedBy?: string;
  remarks?: string;
  photoUrl?: string;
};

export type TaskChecklist = {
  items: TaskChecklistItem[];
};

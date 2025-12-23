export type Checklist = {
  id: string;
  serviceId: string;
  createdAt: Date;
  updatedAt: Date;
  items?: ChecklistItem[];
};

export type ChecklistItem = {
  id: string;
  checklistId: string;
  title: string;
  description?: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

// Status for checklist items in tasks
export type ChecklistItemStatus = 'pending' | 'passed' | 'failed';

// For task's JSON checklist field
export type TaskChecklistItem = {
  id: string;
  title: string;
  description?: string;
  order: number;
  status: ChecklistItemStatus;
  completedAt?: string;
  completedBy?: string;
};

export type TaskChecklist = {
  items: TaskChecklistItem[];
};

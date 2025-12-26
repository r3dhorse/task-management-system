// Section type for service checklist template
export type ChecklistSection = {
  id: string;
  checklistId: string;
  name: string;
  order: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  items?: ChecklistItem[];
};

export type Checklist = {
  id: string;
  serviceId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  sections?: ChecklistSection[];
};

export type ChecklistItem = {
  id: string;
  sectionId: string;
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

// For task's JSON checklist field - item within a section
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

// For task's JSON checklist field - section with items
export type TaskChecklistSection = {
  id: string;
  name: string;
  order: number;
  items: TaskChecklistItem[];
};

// New structured task checklist with sections
export type TaskChecklist = {
  sections: TaskChecklistSection[];
};

// Legacy flat task checklist for backward compatibility
export type LegacyTaskChecklist = {
  items: TaskChecklistItem[];
};

// Utility function to normalize legacy checklist data to new section format
export function normalizeTaskChecklist(data: unknown): TaskChecklist {
  if (!data) return { sections: [] };

  const checklist = data as Record<string, unknown>;

  // Already in new format with sections
  if ('sections' in checklist && Array.isArray(checklist.sections)) {
    return checklist as TaskChecklist;
  }

  // Legacy format with flat items array - migrate to single "General" section
  if ('items' in checklist && Array.isArray(checklist.items)) {
    const legacyItems = checklist.items as TaskChecklistItem[];
    return {
      sections: [{
        id: 'migrated-default',
        name: 'General',
        order: 0,
        items: legacyItems,
      }],
    };
  }

  return { sections: [] };
}

export type Service = {
  id: string;
  name: string;
  workspaceId: string;
  isPublic: boolean;
  slaDays?: number | null;
  includeWeekends: boolean;
  createdAt: Date;
  updatedAt: Date;
};
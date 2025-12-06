export type Workspace = {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  userId: string;
  withReviewStage: boolean;

  // KPI Configuration weights (percentages)
  kpiCompletionWeight: number;
  kpiProductivityWeight: number;
  kpiSlaWeight: number;
  kpiCollaborationWeight: number;
  kpiReviewWeight: number;

  createdAt: Date | string;
  updatedAt: Date | string;
}
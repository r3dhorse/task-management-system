"use client";

import { WorkspaceAnalytics } from "@/components/workspace-analytics";
import { PopulatedTask } from "@/features/tasks/types";
import { Member } from "@/features/members/types";

// ============================================================================
// TYPES
// ============================================================================

interface ServiceType {
  id: string;
  name: string;
  workspaceId: string;
  isPublic: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface KPIWeights {
  kpiCompletionWeight: number;
  kpiProductivityWeight: number;
  kpiSlaWeight: number;
  kpiCollaborationWeight: number;
  kpiReviewWeight: number;
}

interface AnalyticsTabProps {
  /** List of tasks for analytics calculations */
  tasks: PopulatedTask[];
  /** List of workspace members */
  members: Member[];
  /** List of services */
  services: ServiceType[];
  /** Start date for filtering */
  dateFrom?: Date;
  /** End date for filtering */
  dateTo?: Date;
  /** Whether workspace uses review stage */
  withReviewStage?: boolean;
  /** KPI weights configuration */
  kpiWeights?: KPIWeights;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AnalyticsTab - Detailed analytics and KPI dashboard
 *
 * Provides comprehensive analytics including:
 * - Team productivity metrics
 * - Member performance KPIs
 * - Service analytics
 * - SLA compliance tracking
 */
export function AnalyticsTab({
  tasks,
  members,
  services,
  dateFrom,
  dateTo,
  withReviewStage,
  kpiWeights,
}: AnalyticsTabProps) {
  return (
    <div className="space-y-4">
      <WorkspaceAnalytics
        tasks={tasks}
        members={members}
        services={services}
        dateFrom={dateFrom}
        dateTo={dateTo}
        withReviewStage={withReviewStage}
        kpiWeights={kpiWeights}
      />
    </div>
  );
}

export default AnalyticsTab;

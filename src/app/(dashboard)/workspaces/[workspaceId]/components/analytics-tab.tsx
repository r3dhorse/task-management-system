"use client";

import { useState } from "react";
import { WorkspaceAnalytics } from "@/components/workspace-analytics";
import { PopulatedTask } from "@/features/tasks/types";
import { Member } from "@/features/members/types";
import { Button } from "@/components/ui/button";
import { DownloadIcon, Loader2Icon } from "@/lib/lucide-icons";
import { generateAnalyticsPDF } from "@/lib/analytics-pdf";

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
  /** Current workspace ID */
  workspaceId: string;
  /** Start date for filtering */
  dateFrom?: Date;
  /** End date for filtering */
  dateTo?: Date;
  /** Whether workspace uses review stage */
  withReviewStage?: boolean;
  /** KPI weights configuration */
  kpiWeights?: KPIWeights;
  /** Workspace name for report title */
  workspaceName?: string;
  /** Current user name for report footer */
  generatedBy?: string;
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
  workspaceId,
  dateFrom,
  dateTo,
  withReviewStage = true,
  kpiWeights,
  workspaceName = "Workspace",
  generatedBy = "System",
}: AnalyticsTabProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadReport = async () => {
    setIsGeneratingPDF(true);
    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));

      const defaultWeights = {
        kpiCompletionWeight: withReviewStage ? 30.0 : 35.0,
        kpiProductivityWeight: withReviewStage ? 20.0 : 25.0,
        kpiSlaWeight: withReviewStage ? 20.0 : 25.0,
        kpiCollaborationWeight: 15.0,
        kpiReviewWeight: withReviewStage ? 15.0 : 0.0,
      };

      generateAnalyticsPDF({
        workspaceName,
        tasks,
        members,
        services,
        dateFrom,
        dateTo,
        withReviewStage,
        kpiWeights: kpiWeights || defaultWeights,
        generatedBy,
      });
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Download Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Comprehensive view of workspace performance metrics
          </p>
        </div>
        <Button
          onClick={handleDownloadReport}
          disabled={isGeneratingPDF}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md"
        >
          {isGeneratingPDF ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <DownloadIcon className="mr-2 h-4 w-4" />
              Download Report
            </>
          )}
        </Button>
      </div>

      <WorkspaceAnalytics
        tasks={tasks}
        members={members}
        services={services}
        workspaceId={workspaceId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        withReviewStage={withReviewStage}
        kpiWeights={kpiWeights}
      />
    </div>
  );
}

export default AnalyticsTab;

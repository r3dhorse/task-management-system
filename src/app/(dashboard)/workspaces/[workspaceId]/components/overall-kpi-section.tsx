"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGetOverallKPI, MemberOverallKPI } from "@/features/workspaces/api/use-get-overall-kpi";
import { GlobeIcon, TrophyIcon, BuildingIcon, InfoIcon, ChevronRightIcon } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils";

interface OverallKPISectionProps {
  workspaceId: string;
}

function getKPIRating(kpiScore: number): {
  label: string;
  colorClass: string;
  bgClass: string;
} {
  if (kpiScore >= 80) {
    return { label: "Excellent", colorClass: "text-green-600", bgClass: "bg-green-500" };
  }
  if (kpiScore >= 60) {
    return { label: "Good", colorClass: "text-blue-600", bgClass: "bg-blue-500" };
  }
  if (kpiScore >= 40) {
    return { label: "Average", colorClass: "text-yellow-600", bgClass: "bg-yellow-500" };
  }
  return { label: "Needs Improvement", colorClass: "text-red-600", bgClass: "bg-red-500" };
}

function getRankBadgeStyle(index: number): string {
  if (index === 0) return "bg-gradient-to-r from-yellow-400 to-yellow-600";
  if (index === 1) return "bg-gradient-to-r from-gray-300 to-gray-500";
  if (index === 2) return "bg-gradient-to-r from-amber-500 to-amber-700";
  return "bg-gradient-to-r from-blue-400 to-blue-600";
}

export function OverallKPISection({ workspaceId }: OverallKPISectionProps) {
  const { data: overallKPIData, isLoading, error } = useGetOverallKPI({ workspaceId });
  const [selectedMember, setSelectedMember] = useState<MemberOverallKPI | null>(null);
  const [showAllMembers, setShowAllMembers] = useState(false);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
              <GlobeIcon className="h-5 w-5 text-white" />
            </div>
            Overall KPI (Cross-Workspace)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null; // Silently hide if user doesn't have admin access
  }

  if (!overallKPIData || overallKPIData.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
              <GlobeIcon className="h-5 w-5 text-white" />
            </div>
            Overall KPI (Cross-Workspace)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">No members found</p>
        </CardContent>
      </Card>
    );
  }

  const topPerformers = overallKPIData.slice(0, 5);

  return (
    <>
      <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                <GlobeIcon className="h-5 w-5 text-white" />
              </div>
              Overall KPI (Cross-Workspace)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      Consolidated KPI score for each member across all workspaces they belong to.
                      The score is weighted by task involvement in each workspace.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            {overallKPIData.length > 5 && (
              <button
                onClick={() => setShowAllMembers(true)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                View All ({overallKPIData.length})
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPerformers.map((member, index) => (
              <div
                key={member.userId}
                onClick={() => setSelectedMember(member)}
                className="flex items-center justify-between p-3 rounded-lg bg-white/70 hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-indigo-200"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
                      getRankBadgeStyle(index)
                    )}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.userName}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <BuildingIcon className="h-3 w-3" />
                      <span>{member.workspaceCount} workspace{member.workspaceCount !== 1 ? "s" : ""}</span>
                      <span>•</span>
                      <span>{member.totalCompletedAcrossWorkspaces}/{member.totalTasksAcrossWorkspaces} tasks</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "font-bold min-w-[60px] justify-center",
                      member.overallKPI >= 80
                        ? "bg-green-100 text-green-700"
                        : member.overallKPI >= 60
                        ? "bg-blue-100 text-blue-700"
                        : member.overallKPI >= 40
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {member.overallKPI}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Member Detail Modal */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                <TrophyIcon className="h-5 w-5 text-white" />
              </div>
              {selectedMember?.userName}&apos;s Overall KPI
            </DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                  <p className="text-2xl font-bold text-indigo-600">{selectedMember.overallKPI}%</p>
                  <p className="text-xs text-gray-600">Overall KPI</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{selectedMember.workspaceCount}</p>
                  <p className="text-xs text-gray-600">Workspaces</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {selectedMember.totalTasksAcrossWorkspaces > 0
                      ? Math.round((selectedMember.totalCompletedAcrossWorkspaces / selectedMember.totalTasksAcrossWorkspaces) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-gray-600">Completion</p>
                </div>
              </div>

              {/* Workspace Breakdown */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Workspace Breakdown</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {selectedMember.workspaceBreakdown.map((workspace) => {
                    const rating = getKPIRating(workspace.kpiScore);
                    return (
                      <div
                        key={workspace.workspaceId}
                        className="p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <BuildingIcon className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{workspace.workspaceName}</span>
                          </div>
                          <Badge className={cn("font-bold", rating.colorClass)}>
                            {workspace.kpiScore}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                          <div>
                            <span className="text-gray-500">Tasks:</span>{" "}
                            {workspace.tasksCompleted}/{workspace.tasksAssigned}
                          </div>
                          <div>
                            <span className="text-gray-500">Weight:</span>{" "}
                            {Math.round(workspace.weight * 100)}%
                          </div>
                          <div>
                            <span className={rating.colorClass}>{rating.label}</span>
                          </div>
                        </div>
                        {/* Weight visualization */}
                        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", rating.bgClass)}
                            style={{ width: `${workspace.weight * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Formula explanation */}
              <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                <p className="font-medium text-gray-700 mb-1">How Overall KPI is calculated:</p>
                <p>
                  Overall KPI = Σ (Workspace KPI × Weight), where Weight = Tasks in workspace / Total tasks across all workspaces
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* All Members Modal */}
      <Dialog open={showAllMembers} onOpenChange={setShowAllMembers}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                <GlobeIcon className="h-5 w-5 text-white" />
              </div>
              All Members Overall KPI
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({overallKPIData.length} members)
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className={cn(
            "space-y-3 pr-2",
            overallKPIData.length > 5 && "max-h-[400px] overflow-y-auto"
          )}>
            {overallKPIData.map((member, index) => (
              <div
                key={member.userId}
                onClick={() => {
                  setShowAllMembers(false);
                  setSelectedMember(member);
                }}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
                      getRankBadgeStyle(index)
                    )}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.userName}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <BuildingIcon className="h-3 w-3" />
                      <span>{member.workspaceCount} workspace{member.workspaceCount !== 1 ? "s" : ""}</span>
                      <span>•</span>
                      <span>{member.totalCompletedAcrossWorkspaces}/{member.totalTasksAcrossWorkspaces} tasks</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "font-bold min-w-[60px] justify-center",
                      member.overallKPI >= 80
                        ? "bg-green-100 text-green-700"
                        : member.overallKPI >= 60
                        ? "bg-blue-100 text-blue-700"
                        : member.overallKPI >= 40
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {member.overallKPI}%
                  </Badge>
                  <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

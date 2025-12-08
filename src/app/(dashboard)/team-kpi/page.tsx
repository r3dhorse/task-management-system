"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  useGetTeamOverallKPI,
  TeamMemberKPI,
} from "@/features/workspaces/api/use-get-team-overall-kpi";
import { useCurrent } from "@/features/auth/api/use-current";
import {
  UsersIcon,
  TrophyIcon,
  BuildingIcon,
  InfoIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  TargetIcon,
  CheckCircle2Icon,
  TrendingUpIcon,
} from "@/lib/lucide-icons";
import { cn } from "@/lib/utils";

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

export default function TeamKPIPage() {
  const router = useRouter();
  const { data: currentUser, isLoading: isLoadingUser } = useCurrent();
  const { data: teamKPIData, isLoading, error } = useGetTeamOverallKPI();
  const [selectedMember, setSelectedMember] = useState<TeamMemberKPI | null>(null);
  const [showAllMembers, setShowAllMembers] = useState(false);

  // Check if user is admin (has admin workspaces)
  const isAdmin = currentUser?.isAdmin || currentUser?.isSuperAdmin;

  if (isLoadingUser || isLoading) {
    return (
      <div className="flex flex-col gap-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Button>
        </div>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                <UsersIcon className="h-6 w-6 text-white" />
              </div>
              Team Overall KPI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Button>
        </div>
        <Card className="border-0 shadow-lg">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <UsersIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Admin Access Required</p>
              <p className="text-sm mt-2">
                You need to be an admin of at least one workspace to view team KPI.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Button>
        </div>
        <Card className="border-0 shadow-lg">
          <CardContent className="py-12">
            <div className="text-center text-red-500">
              <p>Failed to load team KPI data</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!teamKPIData || teamKPIData.members.length === 0) {
    return (
      <div className="flex flex-col gap-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Button>
        </div>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                <UsersIcon className="h-6 w-6 text-white" />
              </div>
              Team Overall KPI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              No team members found in your workspaces.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { members, adminWorkspaces, teamStats } = teamKPIData;
  const topPerformers = members.slice(0, 10);

  return (
    <div className="flex flex-col gap-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      {/* Page Title */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
          <UsersIcon className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Overall KPI</h1>
          <p className="text-sm text-gray-500">
            Aggregated performance across {adminWorkspaces.length} workspace{adminWorkspaces.length !== 1 ? "s" : ""} you manage
          </p>
        </div>
      </div>

      {/* Team Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50 to-indigo-100">
          <CardContent className="p-4 text-center">
            <UsersIcon className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-indigo-700">{teamStats.totalMembers}</p>
            <p className="text-xs text-indigo-600">Team Members</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4 text-center">
            <TargetIcon className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-700">{teamStats.averageKPI}%</p>
            <p className="text-xs text-purple-600">Average KPI</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 text-center">
            <TrendingUpIcon className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-700">{teamStats.highPerformers}</p>
            <p className="text-xs text-green-600">High Performers</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 text-center">
            <CheckCircle2Icon className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-700">{teamStats.totalCompleted}</p>
            <p className="text-xs text-blue-600">Tasks Completed</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4 text-center">
            <BuildingIcon className="h-6 w-6 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-700">{adminWorkspaces.length}</p>
            <p className="text-xs text-amber-600">Workspaces</p>
          </CardContent>
        </Card>
      </div>

      {/* Workspaces You Manage */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BuildingIcon className="h-5 w-5 text-gray-600" />
            Workspaces You Manage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {adminWorkspaces.map((ws) => (
              <Badge
                key={ws.id}
                variant="secondary"
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200"
              >
                {ws.name}
                <span className="ml-2 text-xs text-gray-500">
                  ({ws.memberCount} members)
                </span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Members KPI */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                <TrophyIcon className="h-5 w-5 text-white" />
              </div>
              Team Performance Rankings
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      KPI scores are aggregated across all workspaces each member belongs to,
                      weighted by their task involvement in each workspace.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            {members.length > 10 && (
              <button
                onClick={() => setShowAllMembers(true)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                View All ({members.length})
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
                      <span>-</span>
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
              {selectedMember?.userName}&apos;s Performance
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
                  Overall KPI = Sum of (Workspace KPI x Weight), where Weight = Tasks in workspace / Total tasks across all workspaces
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* All Members Modal */}
      <Dialog open={showAllMembers} onOpenChange={setShowAllMembers}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                <UsersIcon className="h-5 w-5 text-white" />
              </div>
              All Team Members
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({members.length} members)
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {members.map((member, index) => (
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
                      <span>-</span>
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
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetServices } from "@/features/services/api/use-get-services";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useWorkspaceAuthorization } from "@/features/workspaces/hooks/use-workspace-authorization";
import { useCurrent } from "@/features/auth/api/use-current";
import { Member, MemberRole } from "@/features/members/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/date-picker";
import { CalendarIcon, BarChart3Icon, TrendingUpIcon, GlobeIcon } from "@/lib/lucide-icons";
import { PopulatedTask } from "@/features/tasks/types";
import { subDays, isAfter, isBefore } from "date-fns";
import { DottedSeparator } from "@/components/dotted-separator";

// Extracted tab components
import { OverviewTab, DeadlinesTab, AnalyticsTab, OverallKPISection } from "./components";


const WorkspaceIdPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = useWorkspaceId();
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Get initial tab from URL or default to 'overview'
  const tabFromUrl = searchParams?.get('tab') ?? null;
  const validTabs = useMemo(() => ['overview', 'deadlines', 'analytics', 'overall-kpi'], []);
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tab', value);
    router.push(newUrl.pathname + newUrl.search);
  };

  // Initialize dates after component mounts to avoid SSR issues
  useEffect(() => {
    if (!dateFrom) {
      setDateFrom(subDays(new Date(), 30));
    }
    if (!dateTo) {
      setDateTo(new Date());
    }
  }, [dateFrom, dateTo]);

  // Update activeTab state when URL changes
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && validTabs.includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab, validTabs]);

  const { data: currentUser } = useCurrent();
  const { workspace, isLoading: isLoadingWorkspace, isAuthorized } = useWorkspaceAuthorization({ workspaceId });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({ workspaceId });
  const { data: services, isLoading: isLoadingServices } = useGetServices({ workspaceId });
  const { data: tasks, isLoading: isLoadingTasks } = useGetTasks({
    workspaceId,
    assigneeId: null,
    serviceId: null,
    status: null,
    search: null,
    dueDate: null,
  });

  const isLoading = isLoadingWorkspace || isLoadingMembers || isLoadingTasks || isLoadingServices;

  // Find current user's member record to check role
  const currentMember = members?.documents.find(member => 
    (member as Member).userId === currentUser?.id
  ) as Member | undefined;

  // Filter tasks by date range
  const filteredTasks = useMemo(() => {
    return (tasks?.documents.filter((task) => {
      if (!dateFrom || !dateTo) return true;
      const taskDate = new Date(task.createdAt);
      return isAfter(taskDate, dateFrom) && isBefore(taskDate, dateTo);
    }) || []) as PopulatedTask[];
  }, [tasks?.documents, dateFrom, dateTo]);

  // Redirect customers to workspace tasks page automatically
  useEffect(() => {
    if (currentMember && currentMember.role === MemberRole.CUSTOMER) {
      router.push(`/workspaces/${workspaceId}/workspace-tasks`);
    }
  }, [currentMember, workspaceId, router]);

  // Don't render anything if not authorized (redirection will happen)
  if (!isAuthorized) {
    return null;
  }

  // Prepare member and service data for components
  const membersList = (members?.documents as Member[]) || [];
  const servicesList = services?.documents || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 py-2">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <BarChart3Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {workspace?.name || "Workspace Dashboard"}
            </h1>
            <p className="text-muted-foreground">
              {workspace?.description || "Overview of workspace metrics and performance"}
            </p>
          </div>
        </div>
      </div>

      <DottedSeparator />

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className={`grid w-full max-w-2xl ${(currentMember?.role === MemberRole.ADMIN || currentUser?.isSuperAdmin) ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3Icon className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="deadlines" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Task Deadlines
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUpIcon className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          {(currentMember?.role === MemberRole.ADMIN || currentUser?.isSuperAdmin) && (
            <TabsTrigger value="overall-kpi" className="flex items-center gap-2">
              <GlobeIcon className="h-4 w-4" />
              Overall KPI
            </TabsTrigger>
          )}
        </TabsList>

      {/* Date Range Filter - Hide on Task Deadline and Overall KPI tabs */}
      {activeTab !== "deadlines" && activeTab !== "overall-kpi" && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 w-full relative z-10 mt-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Date Range:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap relative z-0">
            <DatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="From date"
              className="w-44 min-w-[11rem]"
            />
            <span className="text-muted-foreground text-sm shrink-0">to</span>
            <DatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="To date"
              className="w-44 min-w-[11rem]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                setDateTo(today);
                setDateFrom(subDays(today, 7));
              }}
              className="bg-white hover:bg-blue-50 text-xs px-3"
            >
              7 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                setDateTo(today);
                setDateFrom(subDays(today, 15));
              }}
              className="bg-white hover:bg-blue-50 text-xs px-3"
            >
              15 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                setDateTo(today);
                setDateFrom(subDays(today, 30));
              }}
              className="bg-white hover:bg-blue-50 text-xs px-3"
            >
              30 days
            </Button>
          </div>
        </div>
      </Card>
      )}

      {/* Overview Tab Content */}
      <TabsContent value="overview" className="mt-6">
        <OverviewTab
          tasks={filteredTasks}
          members={membersList}
          services={servicesList}
          workspaceId={workspaceId}
          workspaceName={workspace?.name}
        />
      </TabsContent>

      {/* Task Deadlines Tab Content */}
      <TabsContent value="deadlines" className="mt-6">
        <DeadlinesTab
          tasks={filteredTasks}
          workspaceId={workspaceId}
        />
      </TabsContent>

      {/* Analytics Tab Content */}
      <TabsContent value="analytics" className="mt-6 space-y-6">
        <AnalyticsTab
          tasks={filteredTasks}
          members={membersList}
          services={servicesList}
          dateFrom={dateFrom}
          dateTo={dateTo}
          withReviewStage={workspace?.withReviewStage}
          kpiWeights={workspace ? {
            kpiCompletionWeight: workspace.kpiCompletionWeight,
            kpiProductivityWeight: workspace.kpiProductivityWeight,
            kpiSlaWeight: workspace.kpiSlaWeight,
            kpiCollaborationWeight: workspace.kpiCollaborationWeight,
            kpiReviewWeight: workspace.kpiReviewWeight,
          } : undefined}
        />
      </TabsContent>

      {/* Overall KPI Tab Content - Admin Only */}
      {(currentMember?.role === MemberRole.ADMIN || currentUser?.isSuperAdmin) && (
        <TabsContent value="overall-kpi" className="mt-6">
          <OverallKPISection workspaceId={workspaceId} />
        </TabsContent>
      )}
      </Tabs>
    </div>
  );
};

export default WorkspaceIdPage;
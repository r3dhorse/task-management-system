import { useMemo, useState, useEffect } from "react";
import { format, isToday, isTomorrow, addDays, isSameDay, isAfter, isBefore, startOfDay, endOfDay, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Clock3Icon, AlertTriangleIcon, CheckCircle2Icon, ChevronRight, Calendar, CalendarDays, Clock, ChevronLeft, Lock } from "@/lib/lucide-icons";
import { TaskStatus, PopulatedTask } from "@/features/tasks/types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCurrent } from "@/features/auth/api/use-current";

interface TaskDeadlineTimelineProps {
  tasks: PopulatedTask[];
  workspaceId: string;
}

interface TimelineDay {
  date: Date;
  dayLabel: string;
  dateLabel: string;
  tasks: PopulatedTask[];
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
}

export const TaskDeadlineTimeline = ({ tasks, workspaceId }: TaskDeadlineTimelineProps) => {
  const router = useRouter();
  const { data: currentUser } = useCurrent();
  const [dateOffset, setDateOffset] = useState(0); // Days to offset from today

  // Navigation limits: 4 weeks backward and forward
  const MAX_WEEKS_BACKWARD = 4;
  const MAX_WEEKS_FORWARD = 4;
  const MIN_OFFSET = -MAX_WEEKS_BACKWARD * 7; // -28 days
  const MAX_OFFSET = MAX_WEEKS_FORWARD * 7;   // +28 days

  // Helper function to check if user can access confidential task
  const canAccessConfidentialTask = (task: PopulatedTask) => {
    if (!task.isConfidential) return true;
    if (!currentUser) return false;

    // Task creator can always access
    if (task.creatorId === currentUser.id) return true;

    // Assignee can always access
    if (task.assigneeId === currentUser.id) return true;

    // Followers can access
    if (task.followedIds) {
      try {
        const followers = JSON.parse(task.followedIds) as string[];
        if (followers.includes(currentUser.id)) return true;
      } catch {
        // If parsing fails, treat as no followers
      }
    }

    return false;
  };

  const timelineData = useMemo(() => {
    const today = new Date();
    const baseDate = addDays(today, dateOffset);
    const startDate = addDays(baseDate, -2); // Start 2 days ago to show overdue
    const endDate = addDays(baseDate, 14); // Show next 14 days

    // Generate timeline days
    const timelineDays: TimelineDay[] = eachDayOfInterval({
      start: startDate,
      end: endDate
    }).map(date => {
      const dayTasks = tasks.filter(task => {
        if (!task.dueDate || task.status === TaskStatus.DONE || task.status === TaskStatus.ARCHIVED) {
          return false;
        }
        const taskDueDate = new Date(task.dueDate);
        return isSameDay(taskDueDate, date);
      });

      return {
        date,
        dayLabel: format(date, 'EEE'),
        dateLabel: format(date, 'd'),
        tasks: dayTasks,
        isToday: isToday(date),
        isPast: isBefore(date, startOfDay(today)),
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      };
    });

    return timelineDays;
  }, [tasks, dateOffset]);

  const totalTasksWithDeadlines = timelineData.reduce((total, day) => total + day.tasks.length, 0);

  // Calculate total tasks with deadlines in the entire system (not just current window)
  const totalSystemTasksWithDeadlines = useMemo(() => {
    return tasks.filter(task => {
      return task.dueDate && task.status !== TaskStatus.DONE && task.status !== TaskStatus.ARCHIVED;
    }).length;
  }, [tasks]);

  // Navigation functions with limits
  const goToPreviousWeek = () => {
    setDateOffset(prev => Math.max(prev - 7, MIN_OFFSET));
  };

  const goToNextWeek = () => {
    setDateOffset(prev => Math.min(prev + 7, MAX_OFFSET));
  };

  const goToToday = () => {
    setDateOffset(0);
  };

  // Check if navigation buttons should be disabled
  const isPreviousDisabled = dateOffset <= MIN_OFFSET;
  const isNextDisabled = dateOffset >= MAX_OFFSET;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with input fields
      }

      if (event.key === 'ArrowLeft' && !isPreviousDisabled) {
        event.preventDefault();
        goToPreviousWeek();
      } else if (event.key === 'ArrowRight' && !isNextDisabled) {
        event.preventDefault();
        goToNextWeek();
      } else if (event.key === 'Home' || (event.key === 't' && !event.ctrlKey && !event.metaKey)) {
        event.preventDefault();
        goToToday();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPreviousDisabled, isNextDisabled]);

  const handleTaskClick = (task: PopulatedTask) => {
    if (!canAccessConfidentialTask(task)) {
      return; // Prevent navigation for unauthorized confidential tasks
    }
    router.push(`/workspaces/${workspaceId}/tasks/${task.id}`);
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return "bg-blue-500";
      case TaskStatus.IN_PROGRESS:
        return "bg-yellow-500";
      case TaskStatus.IN_REVIEW:
        return "bg-purple-500";
      case TaskStatus.BACKLOG:
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusProgress = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return 25;
      case TaskStatus.IN_PROGRESS:
        return 50;
      case TaskStatus.IN_REVIEW:
        return 75;
      case TaskStatus.DONE:
        return 100;
      default:
        return 0;
    }
  };

  const formatStatusText = (status: TaskStatus) => {
    return status === TaskStatus.IN_PROGRESS ? 'In Progress' :
           status === TaskStatus.IN_REVIEW ? 'In Review' :
           status.charAt(0) + status.slice(1).toLowerCase();
  };

  if (totalSystemTasksWithDeadlines === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
              <CalendarIcon className="h-5 w-5 text-white" />
            </div>
            Task Deadline Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
              <CalendarIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">No Upcoming Deadlines</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              All tasks are either completed or don't have due dates set. Great work keeping up with deadlines!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
              <CalendarIcon className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Task Deadline Timeline
            </span>
            <Badge variant="secondary">
              {totalTasksWithDeadlines} tasks
            </Badge>
          </CardTitle>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
              disabled={isPreviousDisabled}
              className="h-8 w-8 p-0"
              title={isPreviousDisabled ? "Maximum backward limit reached (4 weeks)" : "Previous week"}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="text-xs px-3 h-8"
              disabled={dateOffset === 0}
              title="Go to today"
            >
              Today
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
              disabled={isNextDisabled}
              className="h-8 w-8 p-0"
              title={isNextDisabled ? "Maximum forward limit reached (4 weeks)" : "Next week"}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Date Range Indicator */}
        <div className="mb-4 text-center">
          <div className="text-sm text-gray-600 mb-2">
            {timelineData.length > 0 && (
              <span>
                {format(timelineData[0].date, 'MMM d')} - {format(timelineData[timelineData.length - 1].date, 'MMM d, yyyy')}
              </span>
            )}
          </div>

          {/* Week Position Indicator */}
          <div className="flex items-center justify-center gap-1">
            <span className="text-xs text-gray-500">
              Week {Math.floor(dateOffset / 7) + MAX_WEEKS_BACKWARD + 1} of {MAX_WEEKS_BACKWARD + 1 + MAX_WEEKS_FORWARD}
            </span>
            <div className="flex gap-1 ml-2">
              {Array.from({ length: MAX_WEEKS_BACKWARD + 1 + MAX_WEEKS_FORWARD }, (_, i) => {
                const weekOffset = (i - MAX_WEEKS_BACKWARD) * 7;
                const isCurrentWeek = weekOffset === dateOffset;
                return (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      isCurrentWeek
                        ? 'bg-indigo-500'
                        : 'bg-gray-200'
                    }`}
                    title={`Week ${i + 1}${isCurrentWeek ? ' (current)' : ''}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <ScrollArea className="h-96">
          {/* Timeline Container */}
          <div className="relative">
            {/* Date Headers */}
            <div className="flex gap-2 mb-4 pb-4 border-b">
              {timelineData.map((day, index) => (
                <div
                  key={day.date.toISOString()}
                  className={cn(
                    "flex-1 min-w-[80px] text-center",
                    day.isToday && "bg-blue-50 rounded-lg p-2",
                    day.isPast && "opacity-60"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium",
                    day.isToday ? "text-blue-600" : "text-gray-600",
                    day.isWeekend && "text-red-500"
                  )}>
                    {day.dayLabel}
                  </div>
                  <div className={cn(
                    "text-sm font-bold mt-1",
                    day.isToday ? "text-blue-800" : "text-gray-900",
                    day.isPast && "text-gray-500"
                  )}>
                    {day.dateLabel}
                  </div>
                  {day.isToday && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-1"></div>
                  )}
                </div>
              ))}
            </div>

            {/* Task Bars */}
            <div className="relative min-h-[200px]">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex gap-2">
                {timelineData.map((day, index) => (
                  <div
                    key={`grid-${index}`}
                    className={cn(
                      "flex-1 border-l border-gray-100",
                      day.isToday && "border-blue-200 bg-blue-50/30"
                    )}
                  />
                ))}
              </div>

              {/* Task Items */}
              <div className="relative flex gap-2">
                {timelineData.map((day, dayIndex) => (
                  <div key={`tasks-${dayIndex}`} className="flex-1 min-w-[80px] space-y-2">
                    {day.tasks.map((task, taskIndex) => {
                      const canAccess = canAccessConfidentialTask(task);
                      const isConfidential = task.isConfidential;

                      return (
                        <div
                          key={task.id}
                          className={cn(
                            "group rounded-lg p-2 text-center border transition-all duration-200 relative",
                            canAccess && "cursor-pointer hover:scale-105 hover:shadow-md",
                            !canAccess && isConfidential && "cursor-not-allowed opacity-75",
                            day.isPast
                              ? canAccess
                                ? "bg-red-50 border-red-200 hover:bg-red-100"
                                : "bg-red-50 border-red-300"
                              : day.isToday
                              ? canAccess
                                ? "bg-orange-50 border-orange-200 hover:bg-orange-100"
                                : "bg-orange-50 border-orange-300"
                              : canAccess
                              ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                              : "bg-blue-50 border-blue-300"
                          )}
                          onClick={() => handleTaskClick(task)}
                          style={{
                            minHeight: '40px'
                          }}
                          title={
                            !canAccess && isConfidential
                              ? "Confidential task - Access restricted"
                              : `${task.name} - ${formatStatusText(task.status)}${task.service ? ` (${task.service.name})` : ''}`
                          }
                        >
                        {/* Task Number */}
                        <div className="font-mono font-bold text-gray-900 text-sm">
                          {task.taskNumber}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                          <div
                            className={cn(
                              "h-1 rounded-full transition-all duration-300",
                              getStatusColor(task.status)
                            )}
                            style={{ width: `${getStatusProgress(task.status)}%` }}
                          />
                        </div>

                        {/* Overdue indicator */}
                        {day.isPast && (
                          <div className="absolute top-1 right-1">
                            <AlertTriangleIcon className="h-2 w-2 text-red-500" />
                          </div>
                        )}

                        {/* Confidential indicator */}
                        {isConfidential && (
                          <div className="absolute top-1 left-1">
                            <Lock className={cn(
                              "h-2 w-2",
                              canAccess ? "text-blue-600" : "text-gray-500"
                            )} />
                          </div>
                        )}
                      </div>
                      );
                    })}

                    {/* Empty state for days with no tasks */}
                    {day.tasks.length === 0 && (
                      <div className="text-center py-4 text-gray-300 text-xs">
                        -
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>To Do</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span>In Review</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                <span>Overdue</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-3 w-3 text-blue-600" />
                <span>Confidential</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
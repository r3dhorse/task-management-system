"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { DottedSeparator } from "@/components/dotted-separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useUpdateTask } from "../api/use-update-task";
import { DatePicker } from "@/components/date-picker";
import { TaskStatus, Task } from "../types";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select-simple";
import { useState, useEffect } from "react";
import { MemberRole } from "@/features/members/types";
import { Switch } from "@/components/ui/switch";
import { EyeOffIcon } from "@/lib/lucide-icons";

interface EditTaskFormProps {
  onCancel?: () => void;
  serviceOptions: { id: string; name: string }[];
  membertOptions: { id: string; name: string; role: MemberRole }[];
  followerOptions: MultiSelectOption[]; // Customers only
  collaboratorOptions: MultiSelectOption[]; // Team members only
  initialValues: Task;
  initialAssignees?: { id: string; name: string }[];
  /** Callback when form actions are available (for external footer rendering) */
  onFormReady?: (actions: { submit: () => void; isPending: boolean }) => void;
}

export const EditTaskForm = ({
  onCancel,
  serviceOptions,
  membertOptions,
  followerOptions,
  collaboratorOptions,
  initialValues,
  initialAssignees,
  onFormReady,
}: EditTaskFormProps) => {
  const workspaceId = useWorkspaceId();
  const { mutate, isPending } = useUpdateTask();

  // Notify parent of form actions for external footer rendering
  useEffect(() => {
    if (onFormReady) {
      onFormReady({
        submit: () => {
          const formElement = document.querySelector('form[data-edit-task-form]');
          if (formElement) {
            formElement.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        },
        isPending,
      });
    }
  }, [onFormReady, isPending]);

  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(() => {
    return initialAssignees?.map(a => a.id) || [];
  });

  const [selectedFollowers, setSelectedFollowers] = useState<string[]>(() => {
    try {
      return initialValues.followedIds ? JSON.parse(initialValues.followedIds) : [];
    } catch {
      return [];
    }
  });

  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>(() => {
    try {
      return initialValues.collaboratorIds ? JSON.parse(initialValues.collaboratorIds) : [];
    } catch {
      return [];
    }
  });

  // Create assignee options for the MultiSelect component
  const assigneeOptions = membertOptions
    .filter(member => member.role !== MemberRole.CUSTOMER)
    .map((member) => ({
      value: member.id,
      label: member.name,
      role: member.role,
    }));

  // Filter collaborator options to exclude assignees (to avoid redundancy)
  const filteredCollaboratorOptions = collaboratorOptions.filter(
    option => !selectedAssignees.includes(option.value)
  );

  // Filter follower options to exclude assignees (customers typically can't be assignees, but for safety)
  const filteredFollowerOptions = followerOptions.filter(
    option => !selectedAssignees.includes(option.value)
  );

  // Remove assignees from collaborators/followers when assignees change (to avoid redundancy)
  useEffect(() => {
    if (selectedAssignees.length > 0) {
      // Remove any assignees from collaborators
      setSelectedCollaborators(prev => prev.filter(id => !selectedAssignees.includes(id)));
      // Remove any assignees from followers (shouldn't happen since customers can't be assignees, but just in case)
      setSelectedFollowers(prev => prev.filter(id => !selectedAssignees.includes(id)));
    }
  }, [selectedAssignees]);

  const trimmedSchema = z.object({
    name: z.string().trim().min(1, "Required"),
    status: z.nativeEnum(TaskStatus, { required_error: "Required" }),
    serviceId: z.string().trim().min(1, "Required"),
    dueDate: z.date({ required_error: "Due date is required" }),
    description: z.string().optional(),
    attachmentId: z.string().optional(),
    followedIds: z.string().optional(),
    creatorId: z.string().optional(),
    isConfidential: z.boolean().optional(),
  });

  const form = useForm<z.infer<typeof trimmedSchema>>({
    resolver: zodResolver(trimmedSchema),
    defaultValues: {
      status: initialValues.status,
      name: initialValues.name,
      description: initialValues.description || undefined,
      serviceId: initialValues.serviceId,
      dueDate: initialValues.dueDate
        ? new Date(initialValues.dueDate)
        : undefined,
      isConfidential: initialValues.isConfidential || false,
      attachmentId: initialValues.attachmentId || undefined,
      creatorId: initialValues.creatorId || undefined,
      followedIds: initialValues.followedIds || undefined,
    }
  });

  // Watch the confidential field to enforce assignee requirement
  const isConfidentialValue = form.watch("isConfidential");

  const onSubmit = (values: z.infer<typeof trimmedSchema>) => {
    // Validate that confidential tasks have at least one assignee
    if (values.isConfidential && selectedAssignees.length === 0) {
      return;
    }

    const payload = {
      ...values,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : "",
      assigneeIds: JSON.stringify(selectedAssignees), // JSON string array of assignee IDs
      attachmentId: initialValues.attachmentId || "", // Preserve existing attachment
      workspaceId,
      followedIds: JSON.stringify(selectedFollowers), // JSON string array of customer follower IDs
      collaboratorIds: JSON.stringify(selectedCollaborators), // JSON string array of team member collaborator IDs
      isConfidential: values.isConfidential || false, // Ensure boolean value
    };


    mutate(
      {
        param: { taskId: initialValues.id },
        json: payload
      },
      {
        onSuccess: () => {
          form.reset();
          onCancel?.();
        },
      }
    );
  };

  return (
    <Card className="w-full h-full border-none shadow-none flex flex-col">
      <CardHeader className="flex p-4 sm:p-7 shrink-0">
        <CardTitle className="text-xl font-bold">Update Task</CardTitle>
      </CardHeader>
      <div className="px-4 sm:px-7 shrink-0">
        <DottedSeparator />
      </div>
      <CardContent className="p-4 sm:p-7 flex-1 overflow-y-auto">
        <Form {...form}>
          <form data-edit-task-form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-y-4">
              
              {/* Confidential Toggle - Top of Form */}
              <div className="flex justify-end">
                <FormField
                  control={form.control}
                  name="isConfidential"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <div className="flex items-center gap-2">
                        <EyeOffIcon className="w-4 h-4 text-gray-500" />
                        <FormLabel className="text-sm font-medium cursor-pointer">
                          Confidential
                        </FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              {/* Task Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter task name" />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Assignees - Enhanced UI */}
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Assignees
                  {isConfidentialValue && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                      Required for confidential tasks
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <MultiSelect
                    options={assigneeOptions}
                    selected={selectedAssignees}
                    onChange={setSelectedAssignees}
                    placeholder="Select assignees..."
                    className="w-full"
                  />
                </FormControl>
                <div className="space-y-1 mt-2">
                  {selectedAssignees.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      <span className="font-medium">{selectedAssignees.length} assignee{selectedAssignees.length > 1 ? 's' : ''} selected</span>
                      <span className="text-indigo-500">(Primary task owners)</span>
                    </div>
                  )}
                  {isConfidentialValue && selectedAssignees.length === 0 && (
                    <p className="text-sm text-red-500">At least one assignee is required for confidential tasks</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Team members responsible for completing this task. They have full access to monitor and update the task.
                  </p>
                </div>
              </FormItem>

              {/* Service */}
              <FormField
                control={form.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Service" />
                        </SelectTrigger>
                      </FormControl>
                      <FormMessage />
                      <SelectContent>
                        {serviceOptions.map((service) => (
                          <SelectItem
                            key={service.id}
                            value={String(service.id)}
                          >
                            <div className="flex items-center gap-x-2">
                              <div className="w-6 h-6 rounded-full bg-blue-700 flex items-center justify-center text-sm font-medium text-white">
                                {service.name.charAt(0).toUpperCase()}
                              </div>
                              <span>{service.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Due Date */}
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <DatePicker {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <FormMessage />
                      <SelectContent>
                        <SelectItem value={TaskStatus.BACKLOG}>Backlog</SelectItem>
                        <SelectItem value={TaskStatus.TODO}>Todo</SelectItem>
                        <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                        <SelectItem value={TaskStatus.IN_REVIEW}>In Review</SelectItem>
                        <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter task description..."
                        className="h-[140px] resize-none overflow-y-auto"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Collaborators (Team Members) */}
              <FormItem>
                <FormLabel>Collaborators (Team Members)</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={filteredCollaboratorOptions}
                    selected={selectedCollaborators}
                    onChange={setSelectedCollaborators}
                    placeholder="Select team members to collaborate..."
                    className="w-full"
                  />
                </FormControl>
                <p className="text-sm text-muted-foreground mt-1">
                  Team members who will work on this task. Assignees are excluded as they already monitor the task.
                </p>
              </FormItem>

              {/* Followers (Customers) */}
              {filteredFollowerOptions.length > 0 && (
                <FormItem>
                  <FormLabel>Followers (Customers)</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={filteredFollowerOptions}
                      selected={selectedFollowers}
                      onChange={setSelectedFollowers}
                      placeholder="Select customers to follow this task..."
                      className="w-full"
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customers who will receive updates about this task. They can view task progress but cannot make changes.
                  </p>
                </FormItem>
              )}

            </div>
          </form>
        </Form>
      </CardContent>

      {/* Inline footer - only show when external footer is not used */}
      {!onFormReady && (
        <div className="shrink-0 bg-white border-t p-4">
          <div className="flex flex-col-reverse sm:flex-row items-center gap-3 sm:justify-between">
            <Button
              type="button"
              size="lg"
              variant="secondary"
              onClick={onCancel}
              disabled={isPending}
              className={cn(!onCancel && "invisible", "w-full sm:w-auto min-h-[44px] touch-manipulation")}
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto min-h-[44px] touch-manipulation"
              disabled={isPending}
              onClick={form.handleSubmit(onSubmit)}
            >
              Update Task
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

/** Standalone footer component for use with ResponsiveModal footer prop */
export const EditTaskFormFooter = ({
  onSubmit,
  onCancel,
  isPending,
}: {
  onSubmit: () => void;
  onCancel?: () => void;
  isPending: boolean;
}) => {
  return (
    <div className="flex flex-col-reverse sm:flex-row items-center gap-3 sm:justify-between w-full">
      <Button
        type="button"
        size="lg"
        variant="secondary"
        onClick={onCancel}
        disabled={isPending}
        className={cn(!onCancel && "invisible", "w-full sm:w-auto min-h-[44px] touch-manipulation")}
      >
        Cancel
      </Button>

      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto min-h-[44px] touch-manipulation"
        disabled={isPending}
        onClick={onSubmit}
      >
        Update Task
      </Button>
    </div>
  );
};

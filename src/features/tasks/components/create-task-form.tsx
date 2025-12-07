"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DottedSeparator } from "@/components/dotted-separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCreateTask } from "../api/use-create-task";
import { useCreateSubTask } from "../api/use-create-sub-task";
import { DatePicker } from "@/components/date-picker";
import { TaskStatus } from "../types";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select-simple";
import { useGetServices } from "@/features/services/api/use-get-services";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { MemberRole } from "@/features/members/types";
import { useCurrent } from "@/features/auth/api/use-current";
import { Switch } from "@/components/ui/switch";
import { EyeOff as EyeOffIcon, Clock as ClockIcon } from "@/lib/lucide-icons";
import { calculateSLADueDate, formatSLAInfo } from "@/lib/sla-utils";

/** Handle for imperative form control */
export interface CreateTaskFormHandle {
  submit: () => void;
  isPending: boolean;
}

// Type definitions for API response data
type ServiceDocument = {
  id: string;
  name: string;
  workspaceId: string;
  isPublic: boolean;
  slaDays?: number | null;
  includeWeekends: boolean;
  isRoutinary: boolean;
  createdAt: string;
  updatedAt: string;
};

type MemberDocument = {
  id: string;
  userId: string;
  workspaceId: string;
  role: string;
  joinedAt: string;
  name: string;
  email: string;
};

interface CreateTaskFormProps {
  onCancel?: () => void;
  workspaceOptions: {
    id: string;
    name: string;
  }[];
  userOptions?: {
    id: string;
    name: string;
  }[];
  workspaceId: string;
  parentTaskId?: string;
  initialServiceId?: string;
  onSuccess?: (task: unknown) => void;
  /** Callback when form actions are available (for external footer rendering) */
  onFormReady?: (actions: { submit: () => void; isPending: boolean }) => void;
}

export const CreateTaskForm = ({
  onCancel,
  workspaceOptions,
  userOptions: _userOptions,
  workspaceId,
  parentTaskId,
  initialServiceId,
  onSuccess,
  onFormReady,
}: CreateTaskFormProps) => {
  const { mutate: createTask, isPending: isCreatingTask } = useCreateTask();
  const { mutate: createSubTask, isPending: isCreatingSubTask } = useCreateSubTask({
    taskId: parentTaskId || ""
  });
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const { data: currentUser } = useCurrent();

  const isPending = isCreatingTask || isCreatingSubTask;

  // Notify parent of form actions for external footer rendering
  useEffect(() => {
    if (onFormReady) {
      onFormReady({
        submit: () => {
          // Trigger form validation and submission
          const formElement = document.querySelector('form[data-create-task-form]');
          if (formElement) {
            formElement.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        },
        isPending,
      });
    }
  }, [onFormReady, isPending]);

  const formSchema = z.object({
    name: z.string().trim().min(1, "Required"),
    status: z.nativeEnum(TaskStatus, { required_error: "Required" }),
    workspaceId: z.string().trim().min(1, "Required"),
    serviceId: z.string().trim().min(1, "Required"),
    dueDate: z.date({ required_error: "Due date is required" }),
    description: z.string().min(1, "Description is required"),
    attachmentId: z.string().optional(),
    followedIds: z.string().optional(),
    creatorId: z.string().optional(),
    isConfidential: z.boolean().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workspaceId: workspaceId, // Set current workspace as default
      serviceId: initialServiceId || "", // Use initial service ID if provided
      status: TaskStatus.TODO, // Set default status to TODO
      isConfidential: false, // Default to not confidential
      name: "",
      description: "",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days from now
    },
  });

  // Watch the selected workspace to load services and members dynamically
  const selectedWorkspaceId = form.watch("workspaceId");

  // Watch the confidential field to enforce assignee requirement
  const isConfidentialValue = form.watch("isConfidential");

  // Watch the selected service to update due date based on SLA
  const selectedServiceId = form.watch("serviceId");
  
  // Load services and members for the selected workspace
  const { data: services, isLoading: isLoadingServices } = useGetServices({ 
    workspaceId: selectedWorkspaceId || workspaceId 
  });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({ 
    workspaceId: selectedWorkspaceId || workspaceId 
  });
  
  // Removed - we'll use workspace members for followers instead

  // Create options from the loaded data (exclude routinary services - they auto-generate tasks)
  const serviceOptions = (services?.documents as ServiceDocument[] | undefined)
    ?.filter((service) => !service.isRoutinary)
    ?.map((service) => ({
      id: service.id,
      name: service.name,
      slaDays: service.slaDays,
      includeWeekends: service.includeWeekends,
    })) || [];

  // Get selected service for SLA calculations
  const selectedService = (services?.documents as ServiceDocument[] | undefined)?.find((service) => service.id === selectedServiceId);

  type MemberOption = {
    id: string;
    name: string;
    email: string;
    role: MemberRole;
  };

  const memberOptions: MemberOption[] = members?.documents?.map((member: MemberDocument) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role as MemberRole,
  })) || [];

  // Create assignee options for the AssigneeSelect component
  const assigneeOptions = memberOptions
    .filter((member: MemberOption) => member.role !== MemberRole.CUSTOMER)
    .map((member: MemberOption) => ({
      value: member.id,
      label: member.name,
      email: member.email,
      role: member.role,
    }));

  // Create follower options from workspace members
  const followerOptions = members?.documents?.map((member: MemberDocument) => ({
    value: member.id,
    label: member.name,
    email: member.email,
    role: member.role,
  })) || [];

  // Find current user's member record
  const currentMember = members?.documents?.find((member: MemberDocument) => 
    member.userId === currentUser?.id
  );

  // Reset service and assignees when workspace changes
  useEffect(() => {
    if (selectedWorkspaceId && selectedWorkspaceId !== workspaceId) {
      form.setValue("serviceId", "");
      setSelectedAssignees([]);
    }
  }, [selectedWorkspaceId, workspaceId, form]);

  // Update due date when service changes (SLA-based)
  useEffect(() => {
    if (selectedService?.slaDays) {
      const suggestedDueDate = calculateSLADueDate(
        selectedService.slaDays,
        selectedService.includeWeekends
      );
      if (suggestedDueDate) {
        form.setValue("dueDate", suggestedDueDate);
      }
    } else if (selectedServiceId && !selectedService?.slaDays) {
      // If service has no SLA, set default due date (7 days from now)
      const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      form.setValue("dueDate", defaultDueDate);
    }
  }, [selectedServiceId, selectedService, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Validate that serviceId is selected
    if (!values.serviceId || values.serviceId === "") {
      form.setError("serviceId", { message: "Service is required" });
      return;
    }

    // Validate that confidential tasks have at least one assignee
    if (values.isConfidential && selectedAssignees.length === 0) {
      // Show error for assignees
      return;
    }

    const formattedValues = {
      ...values,
      serviceId: values.serviceId || "", // Convert undefined to empty string
      dueDate: new Date(values.dueDate).toISOString(), // Convert date to ISO string
      attachmentId: "", // No attachment support in creation
      assigneeIds: JSON.stringify(selectedAssignees), // JSON string array of assignee IDs
      followedIds: JSON.stringify(selectedFollowers), // JSON string array of follower IDs
      isConfidential: values.isConfidential || false, // Ensure boolean value
    };


    const successCallback = () => {
      form.reset({
        workspaceId: workspaceId,
        status: TaskStatus.TODO,
        isConfidential: false,
      });
      setSelectedFollowers([]);
      setSelectedAssignees([]);
      onCancel?.();
      onSuccess?.(formattedValues);
    };

    const errorCallback = (_error: Error) => {
      // Error handling is done in the mutation hook
    };

    // Use sub-task API if parentTaskId is provided
    if (parentTaskId) {
      createSubTask(formattedValues, {
        onSuccess: successCallback,
        onError: errorCallback,
      });
    } else {
      createTask({ json: formattedValues }, {
        onSuccess: successCallback,
        onError: errorCallback,
      });
    }
  };

  return (
    <Card className="w-full border-none shadow-none">
      <CardHeader className="flex p-4 sm:p-7">
        <CardTitle className="text-xl font-bold">
          Create a new task
        </CardTitle>
      </CardHeader>
      <div className="px-4 sm:px-7">
        <DottedSeparator />
      </div>
      <CardContent className="p-4 sm:p-7">
        <Form {...form}>
          <form data-create-task-form onSubmit={form.handleSubmit(onSubmit)}>
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

              {/* 1. Task Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter task name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 2. Description */}
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
                        className="resize-none"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 3. Workspace */}
              <FormField
                control={form.control}
                name="workspaceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select workspace" />
                        </SelectTrigger>
                      </FormControl>
                      <FormMessage />
                      <SelectContent>
                        {workspaceOptions.map((workspace) => (
                          <SelectItem key={workspace.id} value={String(workspace.id)}>
                            <div className="flex items-center gap-x-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-sm font-medium text-white">
                                {workspace.name.charAt(0).toUpperCase()}
                              </div>
                              <span>{workspace.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* 4. Service (only services from selected workspace) */}
              <FormField
                control={form.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isLoadingServices || !selectedWorkspaceId} required>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            isLoadingServices 
                              ? "Loading services..." 
                              : !selectedWorkspaceId 
                                ? "Select workspace first"
                                : "Select Service *"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <FormMessage />
                      <SelectContent>
                        {serviceOptions.length === 0 && !isLoadingServices && selectedWorkspaceId && (
                          <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                            No services found in this workspace
                          </div>
                        )}
                        {serviceOptions.map((service) => (
                          <SelectItem key={service.id} value={String(service.id)}>
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-x-2">
                                <div className="w-6 h-6 rounded-full bg-blue-700 flex items-center justify-center text-sm font-medium text-white">
                                  {service.name.charAt(0).toUpperCase()}
                                </div>
                                <span>{service.name}</span>
                              </div>
                              {service.slaDays && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <ClockIcon className="w-3 h-3" />
                                  <span>{formatSLAInfo(service.slaDays, service.includeWeekends)}</span>
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* 5. Due Date */}
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Due Date
                      {selectedService?.slaDays && (
                        <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                          <ClockIcon className="w-3 h-3" />
                          SLA: {formatSLAInfo(selectedService.slaDays, selectedService.includeWeekends)}
                        </div>
                      )}
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        disabled={field.disabled}
                      />
                    </FormControl>
                    {selectedService?.slaDays ? (
                      <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                        ✓ Due date automatically set based on service SLA ({formatSLAInfo(selectedService.slaDays, selectedService.includeWeekends)}). You can adjust if needed.
                      </p>
                    ) : selectedServiceId && !selectedService?.slaDays ? (
                      <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                        ⚠️ No SLA configured for this service. Default due date set to 7 days from now.
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 6. Assignees (Multi-select) */}
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
                    placeholder={
                      isLoadingMembers
                        ? "Loading members..."
                        : !selectedWorkspaceId
                          ? "Select workspace first"
                          : "Select assignees..."
                    }
                    className="w-full"
                  />
                </FormControl>
                {isConfidentialValue && selectedAssignees.length === 0 && (
                  <p className="text-sm text-destructive">At least one assignee is required for confidential tasks</p>
                )}
              </FormItem>

              {/* 7. Collaborators (Workspace Members) */}
              <FormItem>
                <FormLabel>Collaborators</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={followerOptions}
                    selected={selectedFollowers}
                    onChange={setSelectedFollowers}
                    placeholder="Select members to collaborate on this task..."
                    className="w-full"
                    dropdownDirection="up"
                  />
                </FormControl>
                <div className="space-y-1 mt-2">
                  {currentMember && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">{currentMember.name}</span>
                      <span className="text-blue-500">(You - automatically added)</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    You will automatically be a collaborator on any task you create. Selected users will receive notifications and updates about this task.
                  </p>
                </div>
              </FormItem>


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
              Create Task
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

/** Standalone footer component for use with ResponsiveModal footer prop */
export const CreateTaskFormFooter = ({
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
        Create Task
      </Button>
    </div>
  );
};

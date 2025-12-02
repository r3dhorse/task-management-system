"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DottedSeparator } from "@/components/dotted-separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/date-picker";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select-simple";
import { AssigneeSelect } from "@/components/ui/assignee-select";
import { TaskStatus, Task } from "../types";
import { MemberRole } from "@/features/members/types";
import { EyeOff as EyeOffIcon, Clock as ClockIcon, Loader2 } from "@/lib/lucide-icons";
import { calculateSLADueDate, formatSLAInfo } from "@/lib/sla-utils";
import { TASK_STATUS_CONFIG } from "@/lib/constants/task-constants";

// ============================================================================
// TYPES
// ============================================================================

export interface ServiceOption {
  id: string;
  name: string;
  slaDays?: number | null;
  includeWeekends?: boolean;
}

export interface MemberOption {
  id: string;
  name: string;
  email?: string;
  role: MemberRole;
}

export interface WorkspaceOption {
  id: string;
  name: string;
}

export interface TaskFormValues {
  name: string;
  description: string;
  status: TaskStatus;
  workspaceId: string;
  serviceId: string;
  dueDate: Date;
  assigneeId?: string;
  reviewerId?: string;
  followedIds?: string;
  isConfidential?: boolean;
  attachmentId?: string;
}

export interface BaseTaskFormProps {
  /** Form mode - create or edit */
  mode: "create" | "edit";
  /** Initial values for the form (required for edit mode) */
  initialValues?: Partial<Task>;
  /** Workspace options for workspace selector */
  workspaceOptions?: WorkspaceOption[];
  /** Service options (will be loaded if not provided) */
  serviceOptions?: ServiceOption[];
  /** Member options for assignee/followers */
  memberOptions?: MemberOption[];
  /** Follower options formatted for MultiSelect */
  followerOptions?: MultiSelectOption[];
  /** Current workspace ID */
  workspaceId: string;
  /** Parent task ID for subtasks */
  parentTaskId?: string;
  /** Pre-selected service ID */
  initialServiceId?: string;
  /** Current user's member record */
  currentMember?: { id: string; name: string };
  /** Loading states */
  isLoadingServices?: boolean;
  isLoadingMembers?: boolean;
  /** Form submission handler */
  onSubmit: (values: TaskFormValues, followers: string[]) => void;
  /** Cancel handler */
  onCancel?: () => void;
  /** Is form submitting */
  isSubmitting?: boolean;
  /** Custom title */
  title?: string;
  /** Hide workspace selector */
  hideWorkspaceSelector?: boolean;
  /** Hide status selector */
  hideStatusSelector?: boolean;
  /** Show reviewer selector */
  showReviewer?: boolean;
  /** Card styling */
  cardClassName?: string;
}

// ============================================================================
// FORM SCHEMA
// ============================================================================

const createFormSchema = (mode: "create" | "edit") =>
  z
    .object({
      name: z.string().trim().min(1, "Task name is required"),
      description: mode === "create"
        ? z.string().min(1, "Description is required")
        : z.string().optional(),
      status: z.nativeEnum(TaskStatus, { required_error: "Status is required" }),
      workspaceId: z.string().trim().min(1, "Workspace is required"),
      serviceId: z.string().trim().min(1, "Service is required"),
      dueDate: z.date({ required_error: "Due date is required" }),
      assigneeId: z.string().optional(),
      reviewerId: z.string().optional(),
      followedIds: z.string().optional(),
      isConfidential: z.boolean().optional(),
      attachmentId: z.string().optional(),
    })
    .refine(
      (data) => {
        // If task is confidential, assignee must be set
        if (
          data.isConfidential &&
          (!data.assigneeId || data.assigneeId === "unassigned" || data.assigneeId === "")
        ) {
          return false;
        }
        return true;
      },
      {
        message: "Assignee is required for confidential tasks",
        path: ["assigneeId"],
      }
    );

type FormSchema = z.infer<ReturnType<typeof createFormSchema>>;

// ============================================================================
// FORM FIELD COMPONENTS
// ============================================================================

interface ConfidentialToggleProps {
  form: UseFormReturn<FormSchema>;
}

function ConfidentialToggle({ form }: ConfidentialToggleProps) {
  return (
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
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}

interface ServiceSelectorProps {
  form: UseFormReturn<FormSchema>;
  serviceOptions: ServiceOption[];
  isLoading?: boolean;
  disabled?: boolean;
  selectedService?: ServiceOption;
}

function ServiceSelector({
  form,
  serviceOptions,
  isLoading,
  disabled,
  selectedService,
}: ServiceSelectorProps) {
  return (
    <FormField
      control={form.control}
      name="serviceId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            Service <span className="text-red-500">*</span>
          </FormLabel>
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={isLoading || disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoading
                      ? "Loading services..."
                      : disabled
                      ? "Select workspace first"
                      : "Select service"
                  }
                />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {serviceOptions.length === 0 && !isLoading && (
                <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                  No services found
                </div>
              )}
              {serviceOptions.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                        {service.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{service.name}</span>
                    </div>
                    {service.slaDays && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ClockIcon className="w-3 h-3" />
                        <span>
                          {formatSLAInfo(service.slaDays, service.includeWeekends || false)}
                        </span>
                      </div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface StatusSelectorProps {
  form: UseFormReturn<FormSchema>;
}

function StatusSelector({ form }: StatusSelectorProps) {
  const statuses = Object.values(TaskStatus).filter(
    (status) => status !== TaskStatus.ARCHIVED
  );

  return (
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
            <SelectContent>
              {statuses.map((status) => {
                const config = TASK_STATUS_CONFIG[status];
                return (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      <span>{config.emoji}</span>
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Base Task Form - Unified form component for creating and editing tasks
 *
 * Features:
 * - Supports both create and edit modes
 * - Responsive layout (mobile-first)
 * - SLA-aware due date calculation
 * - Confidential task support
 * - Collaborator/follower selection
 * - Validation with helpful error messages
 */
export function BaseTaskForm({
  mode,
  initialValues,
  workspaceOptions = [],
  serviceOptions = [],
  memberOptions = [],
  followerOptions = [],
  workspaceId,
  parentTaskId,
  initialServiceId,
  currentMember,
  isLoadingServices = false,
  isLoadingMembers = false,
  onSubmit,
  onCancel,
  isSubmitting = false,
  title,
  hideWorkspaceSelector = false,
  hideStatusSelector = false,
  showReviewer = false,
  cardClassName,
}: BaseTaskFormProps) {
  // Parse initial followers
  const initialFollowers = useMemo(() => {
    if (!initialValues?.followedIds) return [];
    try {
      return JSON.parse(initialValues.followedIds);
    } catch {
      return [];
    }
  }, [initialValues?.followedIds]);

  const [selectedFollowers, setSelectedFollowers] = useState<string[]>(initialFollowers);

  // Create form schema based on mode
  const formSchema = useMemo(() => createFormSchema(mode), [mode]);

  // Default values based on mode
  const defaultValues = useMemo(() => {
    if (mode === "edit" && initialValues) {
      return {
        name: initialValues.name || "",
        description: initialValues.description || "",
        status: initialValues.status || TaskStatus.TODO,
        workspaceId: initialValues.workspaceId || workspaceId,
        serviceId: initialValues.serviceId || "",
        dueDate: initialValues.dueDate ? new Date(initialValues.dueDate) : new Date(),
        assigneeId: initialValues.assigneeId || "unassigned",
        reviewerId: initialValues.reviewerId || "",
        isConfidential: initialValues.isConfidential || false,
        attachmentId: initialValues.attachmentId || "",
      };
    }

    // Create mode defaults
    return {
      name: "",
      description: "",
      status: TaskStatus.TODO,
      workspaceId: workspaceId,
      serviceId: initialServiceId || "",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      assigneeId: "",
      reviewerId: "",
      isConfidential: false,
      attachmentId: "",
    };
  }, [mode, initialValues, workspaceId, initialServiceId]);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Watch values for reactive updates
  const selectedWorkspaceId = form.watch("workspaceId");
  const selectedServiceId = form.watch("serviceId");
  const isConfidentialValue = form.watch("isConfidential");

  // Find selected service for SLA info
  const selectedService = useMemo(
    () => serviceOptions.find((s) => s.id === selectedServiceId),
    [serviceOptions, selectedServiceId]
  );

  // Create assignee options (exclude visitors)
  const assigneeOptions = useMemo(
    () =>
      memberOptions
        .filter((member) => member.role !== MemberRole.VISITOR)
        .map((member) => ({
          value: member.id,
          label: member.name,
          email: member.email,
          role: member.role,
        })),
    [memberOptions]
  );

  // Update due date when service changes (for create mode with SLA)
  useEffect(() => {
    if (mode !== "create") return;

    if (selectedService?.slaDays) {
      const suggestedDueDate = calculateSLADueDate(
        selectedService.slaDays,
        selectedService.includeWeekends || false
      );
      if (suggestedDueDate) {
        form.setValue("dueDate", suggestedDueDate);
      }
    } else if (selectedServiceId && !selectedService?.slaDays) {
      // No SLA - set default 7 days
      form.setValue("dueDate", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    }
  }, [mode, selectedServiceId, selectedService, form]);

  // Clear assignee when confidential is toggled on with invalid value
  useEffect(() => {
    const currentAssignee = form.getValues("assigneeId");
    if (
      isConfidentialValue &&
      (!currentAssignee || currentAssignee === "unassigned")
    ) {
      form.setValue("assigneeId", "");
    }
  }, [isConfidentialValue, form]);

  // Reset service when workspace changes (create mode only)
  useEffect(() => {
    if (mode === "create" && selectedWorkspaceId !== workspaceId) {
      form.setValue("serviceId", "");
      form.setValue("assigneeId", "");
    }
  }, [mode, selectedWorkspaceId, workspaceId, form]);

  // Handle form submission
  const handleSubmit = useCallback(
    (values: FormSchema) => {
      // Validate service selection
      if (!values.serviceId) {
        form.setError("serviceId", { message: "Service is required" });
        return;
      }

      const formattedValues: TaskFormValues = {
        ...values,
        description: values.description || "",
        dueDate: values.dueDate,
        assigneeId:
          values.assigneeId === "unassigned" ? "" : values.assigneeId || "",
        reviewerId: values.reviewerId || "",
        isConfidential: values.isConfidential || false,
      };

      onSubmit(formattedValues, selectedFollowers);
    },
    [form, onSubmit, selectedFollowers]
  );

  // Form title
  const formTitle = title || (mode === "create" ? "Create a new task" : "Update Task");

  return (
    <Card className={cn("w-full h-full border-none shadow-none", cardClassName)}>
      <CardHeader className="flex p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl font-bold">{formTitle}</CardTitle>
      </CardHeader>

      <div className="px-4 sm:px-6">
        <DottedSeparator />
      </div>

      <CardContent className="p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="flex flex-col gap-y-4">
              {/* Confidential Toggle */}
              <ConfidentialToggle form={form} />

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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description{mode === "create" && <span className="text-red-500"> *</span>}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter task description..."
                        className="resize-none min-h-[80px]"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Workspace Selector (create mode only) */}
              {!hideWorkspaceSelector && workspaceOptions.length > 0 && (
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
                        <SelectContent>
                          {workspaceOptions.map((workspace) => (
                            <SelectItem key={workspace.id} value={workspace.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                                  {workspace.name.charAt(0).toUpperCase()}
                                </div>
                                <span>{workspace.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Service Selector */}
              <ServiceSelector
                form={form}
                serviceOptions={serviceOptions}
                isLoading={isLoadingServices}
                disabled={!selectedWorkspaceId}
                selectedService={selectedService}
              />

              {/* Due Date with SLA Info */}
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 flex-wrap">
                      Due Date
                      {selectedService?.slaDays && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          <ClockIcon className="w-3 h-3 inline mr-1" />
                          SLA: {formatSLAInfo(selectedService.slaDays, selectedService.includeWeekends || false)}
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        disabled={field.disabled}
                      />
                    </FormControl>
                    {mode === "create" && selectedService?.slaDays && (
                      <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                        ✓ Due date set based on SLA. You can adjust if needed.
                      </p>
                    )}
                    {mode === "create" && selectedServiceId && !selectedService?.slaDays && (
                      <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                        ⚠️ No SLA configured. Default: 7 days from now.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status Selector (edit mode) */}
              {!hideStatusSelector && mode === "edit" && <StatusSelector form={form} />}

              {/* Assignee */}
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 flex-wrap">
                      Assignee
                      {isConfidentialValue && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                          Required for confidential tasks
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <AssigneeSelect
                        options={assigneeOptions}
                        selected={field.value || "unassigned"}
                        onChange={field.onChange}
                        disabled={isLoadingMembers || !selectedWorkspaceId}
                        allowUnassigned={!isConfidentialValue}
                        placeholder={
                          isLoadingMembers
                            ? "Loading members..."
                            : !selectedWorkspaceId
                            ? "Select workspace first"
                            : "Select assignee"
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reviewer (optional) */}
              {showReviewer && (
                <FormField
                  control={form.control}
                  name="reviewerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reviewer</FormLabel>
                      <FormControl>
                        <AssigneeSelect
                          options={assigneeOptions}
                          selected={field.value || "unassigned"}
                          onChange={field.onChange}
                          disabled={isLoadingMembers}
                          allowUnassigned
                          placeholder="Select reviewer (optional)"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Collaborators */}
              <FormItem>
                <FormLabel>
                  {mode === "create" ? "Collaborators" : "Followers"}
                </FormLabel>
                <FormControl>
                  <MultiSelect
                    options={followerOptions}
                    selected={selectedFollowers}
                    onChange={setSelectedFollowers}
                    placeholder={`Select members to ${mode === "create" ? "collaborate on" : "follow"} this task...`}
                    className="w-full"
                    dropdownDirection={mode === "create" ? "up" : "down"}
                  />
                </FormControl>
                <div className="space-y-1 mt-2">
                  {mode === "create" && currentMember && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="font-medium">{currentMember.name}</span>
                      <span className="text-blue-500">(You - automatically added)</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {mode === "create"
                      ? "You will automatically be a collaborator on any task you create."
                      : "Selected members will receive notifications about this task."}
                  </p>
                </div>
              </FormItem>

              {/* Actions */}
              <DottedSeparator />
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className={cn(
                    !onCancel && "invisible",
                    "w-full sm:w-auto min-h-[44px] touch-manipulation"
                  )}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto min-h-[44px] touch-manipulation"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {mode === "create" ? "Creating..." : "Updating..."}
                    </>
                  ) : mode === "create" ? (
                    parentTaskId ? "Create Subtask" : "Create Task"
                  ) : (
                    "Update Task"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default BaseTaskForm;

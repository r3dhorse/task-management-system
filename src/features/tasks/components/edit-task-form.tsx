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
import { AssigneeSelect } from "@/components/ui/assignee-select";
import { useState, useEffect } from "react";
import { MemberRole } from "@/features/members/types";
import { Switch } from "@/components/ui/switch";
import { EyeOffIcon } from "@/lib/lucide-icons";

interface EditTaskFormProps {
  onCancel?: () => void;
  serviceOptions: { id: string; name: string }[];
  membertOptions: { id: string; name: string; role: MemberRole }[];
  followerOptions: MultiSelectOption[];
  initialValues: Task;
  /** Callback when form actions are available (for external footer rendering) */
  onFormReady?: (actions: { submit: () => void; isPending: boolean }) => void;
}

export const EditTaskForm = ({
  onCancel,
  serviceOptions,
  membertOptions,
  followerOptions,
  initialValues,
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

  // Create assignee options for the AssigneeSelect component
  const assigneeOptions = membertOptions
    .filter(member => member.role !== MemberRole.VISITOR)
    .map((member) => ({
      value: member.id,
      label: member.name,
      role: member.role,
    }));
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>(() => {
    try {
      return initialValues.followedIds ? JSON.parse(initialValues.followedIds) : [];
    } catch {
      return [];
    }
  });

  const trimmedSchema = z.object({
    name: z.string().trim().min(1, "Required"),
    status: z.nativeEnum(TaskStatus, { required_error: "Required" }),
    serviceId: z.string().trim().min(1, "Required"),
    dueDate: z.date({ required_error: "Due date is required" }),
    assigneeId: z.string().optional(),
    description: z.string().optional(),
    attachmentId: z.string().optional(),
    followedIds: z.string().optional(),
    creatorId: z.string().optional(),
    isConfidential: z.boolean().optional(),
  }).refine((data) => {
    // If task is confidential, assignee must be required and not "unassigned"
    if (data.isConfidential && (!data.assigneeId || data.assigneeId === "unassigned" || data.assigneeId === "")) {
      return false;
    }
    return true;
  }, {
    message: "Assignee is required for confidential tasks",
    path: ["assigneeId"],
  });

  const form = useForm<z.infer<typeof trimmedSchema>>({
    resolver: zodResolver(trimmedSchema),
    defaultValues: {
      status: initialValues.status,
      name: initialValues.name,
      description: initialValues.description || undefined,
      serviceId: initialValues.serviceId,
      assigneeId: initialValues.assigneeId || "unassigned",
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

  // Clear assignee if it's "unassigned" when confidential is toggled on
  useEffect(() => {
    if (isConfidentialValue && (form.getValues("assigneeId") === "unassigned" || !form.getValues("assigneeId"))) {
      form.setValue("assigneeId", "");
    }
  }, [isConfidentialValue, form]);

  const onSubmit = (values: z.infer<typeof trimmedSchema>) => {
    const payload = {
      ...values,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : "",
      assigneeId: values.assigneeId === "unassigned" ? "" : values.assigneeId || "", // Ensure empty string instead of undefined
      attachmentId: initialValues.attachmentId || "", // Preserve existing attachment
      workspaceId,
      followedIds: JSON.stringify(selectedFollowers), // JSON string array of follower IDs
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

              {/* Assignee */}
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
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
                        allowUnassigned={!isConfidentialValue}
                        placeholder="Select assignee"
                      />
                    </FormControl>
                    <FormMessage />
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

              {/* Followers (Workspace Members) */}
              <FormItem>
                <FormLabel>Followers</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={followerOptions}
                    selected={selectedFollowers}
                    onChange={setSelectedFollowers}
                    placeholder="Select members to follow this task..."
                    className="w-full"
                  />
                </FormControl>
                <p className="text-sm text-muted-foreground mt-1">
                  Selected members will receive notifications and updates about this task.
                </p>
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

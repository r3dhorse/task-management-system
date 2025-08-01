"use client";

import { useState } from "react";
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
import { DatePicker } from "@/components/date-picker";
import { TaskStatus } from "../types";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/file-upload";
import { MultiSelect } from "@/components/ui/multi-select-simple";
import { useGetServices } from "@/features/services/api/use-get-services";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { MemberRole } from "@/features/members/types";
import { useCurrent } from "@/features/auth/api/use-current";
import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { EyeOffIcon } from "lucide-react";

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
}

export const CreateTaskForm = ({
  onCancel,
  workspaceOptions,
  userOptions: _userOptions,
  workspaceId,
}: CreateTaskFormProps) => {
  const { mutate, isPending } = useCreateTask();
  const [attachmentId, setAttachmentId] = useState<string>("");
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const { data: currentUser } = useCurrent();

  const formSchema = z.object({
    name: z.string().trim().min(1, "Required"),
    status: z.nativeEnum(TaskStatus, { required_error: "Required" }),
    workspaceId: z.string().trim().min(1, "Required"),
    serviceId: z.string().trim().min(1, "Required"),
    dueDate: z.date().optional(),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workspaceId: workspaceId, // Set current workspace as default
      serviceId: "", // Initialize as empty string
      assigneeId: "", // Initialize as empty string
      status: TaskStatus.TODO, // Set default status to TODO
      isConfidential: false, // Default to not confidential
      name: "",
      description: "",
    },
  });

  // Watch the selected workspace to load services and members dynamically
  const selectedWorkspaceId = form.watch("workspaceId");
  
  // Watch the confidential field to enforce assignee requirement
  const isConfidentialValue = form.watch("isConfidential");
  
  // Load services and members for the selected workspace
  const { data: services, isLoading: isLoadingServices } = useGetServices({ 
    workspaceId: selectedWorkspaceId || workspaceId 
  });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({ 
    workspaceId: selectedWorkspaceId || workspaceId 
  });
  
  // Removed - we'll use workspace members for followers instead

  // Create options from the loaded data
  const serviceOptions = services?.documents?.map((service) => ({
    id: service.id,
    name: service.name,
  })) || [];

  const memberOptions = members?.documents?.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role as MemberRole,
  })) || [];

  // Create follower options from workspace members
  const followerOptions = members?.documents?.map((member) => ({
    value: member.id,
    label: member.name,
    email: member.email,
  })) || [];

  // Find current user's member record
  const currentMember = members?.documents?.find(member => 
    member.userId === currentUser?.id
  );

  // Reset service and assignee when workspace changes
  useEffect(() => {
    if (selectedWorkspaceId && selectedWorkspaceId !== workspaceId) {
      form.setValue("serviceId", "");
      form.setValue("assigneeId", "");
    }
  }, [selectedWorkspaceId, workspaceId, form]);

  // Clear assignee if it's "unassigned" when confidential is toggled on
  useEffect(() => {
    if (isConfidentialValue && (form.getValues("assigneeId") === "unassigned" || !form.getValues("assigneeId"))) {
      form.setValue("assigneeId", "");
    }
  }, [isConfidentialValue, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Validate that serviceId is selected
    if (!values.serviceId || values.serviceId === "") {
      form.setError("serviceId", { message: "Service is required" });
      return;
    }

    const formattedValues = {
      ...values,
      serviceId: values.serviceId || "", // Convert undefined to empty string
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : "", // Convert date to ISO string
      attachmentId: attachmentId || "", // Send empty string instead of undefined
      assigneeId: values.assigneeId === "unassigned" ? "" : values.assigneeId || "", // Send empty string if unassigned
      followedIds: JSON.stringify(selectedFollowers), // JSON string array of follower IDs
      isConfidential: values.isConfidential || false, // Ensure boolean value
    };

    console.log("Frontend: Form values before submission:", values);
    console.log("Frontend: Formatted values being sent:", formattedValues);

    mutate({ json: formattedValues }, {
      onSuccess: () => {
        form.reset({
          workspaceId: workspaceId,
          status: TaskStatus.TODO,
          isConfidential: false,
        });
        setAttachmentId("");
        setSelectedFollowers([]);
        onCancel?.();
      },
      onError: (_error) => {
        // The error is already handled by the useCreateTask hook
      },
    });
  };

  return (
    <Card className="w-full h-full border-none shadow-none">
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
          <form onSubmit={form.handleSubmit(onSubmit)}>
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

              {/* 5. Assignee */}
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
                    <Select value={field.value} onValueChange={field.onChange} disabled={isLoadingMembers || !selectedWorkspaceId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            isLoadingMembers 
                              ? "Loading members..." 
                              : !selectedWorkspaceId 
                                ? "Select workspace first"
                                : "Select assignee"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <FormMessage />
                      <SelectContent>
                        {!isConfidentialValue && (
                          <SelectItem value="unassigned">
                            <div className="flex items-center gap-x-2 w-full">
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                                ?
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-sm font-medium">Unassigned</span>
                                <span className="text-xs text-muted-foreground">No assignee selected</span>
                              </div>
                            </div>
                          </SelectItem>
                        )}
                        {memberOptions.filter(member => member.role !== MemberRole.VISITOR).length === 0 && !isLoadingMembers && selectedWorkspaceId && (
                          <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                            No assignable members found in this workspace
                          </div>
                        )}
                        {memberOptions
                          .filter(member => member.role !== MemberRole.VISITOR)
                          .map((member) => (
                          <SelectItem key={member.id} value={String(member.id)}>
                            <div className="flex items-center gap-x-2 w-full">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-sm font-medium truncate">{member.name}</span>
                                <span className="text-xs text-muted-foreground truncate">{member.email}</span>
                              </div>
                              <div className="flex-shrink-0">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  member.role === 'ADMIN' 
                                    ? 'bg-red-100 text-red-700' 
                                    : member.role === 'MEMBER'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {member.role}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* 6. Status (default value TODO) */}
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
                        <SelectItem value={TaskStatus.BACKLOG}>
                          Backlog
                        </SelectItem>
                        <SelectItem value={TaskStatus.TODO}>
                          Todo
                        </SelectItem>
                        <SelectItem value={TaskStatus.IN_PROGRESS}>
                          In Progress
                        </SelectItem>
                        <SelectItem value={TaskStatus.IN_REVIEW}>
                          In Review
                        </SelectItem>
                        <SelectItem value={TaskStatus.DONE}>
                          Done
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* 7. Due Date (optional) */}
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <FormControl>
                      <DatePicker {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 8. Followers (Workspace Members) */}
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
                <div className="space-y-1 mt-2">
                  {currentMember && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">{currentMember.name}</span>
                      <span className="text-blue-500">(You - automatically added)</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    You will automatically follow any task you create. Selected users will receive notifications and updates about this task.
                  </p>
                </div>
              </FormItem>

              {/* 9. Attachment */}
              <div>
                <FileUpload
                  onFileUploaded={(fileId) => {
                    setAttachmentId(fileId);
                  }}
                  onFileRemoved={() => {
                    setAttachmentId("");
                  }}
                  disabled={isPending}
                />
              </div>

              <DottedSeparator />
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
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
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto min-h-[44px] touch-manipulation"
                  disabled={isPending}
                >
                  Create Task
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updateWorkspaceSchema } from "../schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { Workspace } from "../types";
import { 
  ArrowLeftIcon, 
  CopyIcon, 
  SettingsIcon, 
  UsersIcon, 
  LinkIcon, 
  ShieldIcon,
  TrashIcon,
  RefreshCwIcon,
  CheckIcon,
  AlertTriangleIcon,
  CalendarIcon,
  ClockIcon,
  BrushIcon,
  InfoIcon,
  ExternalLinkIcon
} from "lucide-react";
import { useUpdateWorkspace } from "../api/use-update-workspace";
import { useConfirm } from "@/hooks/use-confirm";
import { useDeleteWorkspace } from "../api/use-delete-workspace";
import { toast } from 'sonner';
import { useResetInviteCode } from "../api/use-reset-invite-code";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useCurrent } from "@/features/auth/api/use-current";
import { MemberRole } from "@/features/members/types";
import { format } from "date-fns";

interface PopulatedMember {
  $id: string;
  userId: string;
  workspaceId: string;
  role: MemberRole;
  name: string;
  email: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $collectionId: string;
  $databaseId: string;
}

interface EnhancedWorkspaceSettingsProps {
  onCancel?: () => void;
  initialValues: Workspace;
}

// Extended schema for future enhancements
const extendedWorkspaceSchema = updateWorkspaceSchema.extend({
  description: z.string().optional(),
});

export const EnhancedWorkspaceSettings = ({ onCancel, initialValues }: EnhancedWorkspaceSettingsProps) => {
  const router = useRouter();
  const { data: currentUser } = useCurrent();
  const { data: membersData } = useGetMembers({ workspaceId: initialValues.$id });
  const [activeTab, setActiveTab] = useState("general");
  const [origin, setOrigin] = useState("");
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);
  
  const { mutate: updateWorkspace, isPending } = useUpdateWorkspace();
  const { mutate: deleteWorkspace, isPending: isDeletingWorkspace } = useDeleteWorkspace();
  const { mutate: resetInviteCode, isPending: isResettingInviteCode } = useResetInviteCode();

  // Find current user's role
  const currentMember = membersData?.documents?.find(member => (member as PopulatedMember).userId === currentUser?.$id) as PopulatedMember | undefined;
  const isAdmin = currentMember?.role === MemberRole.ADMIN;

  const [DeleteDialog, confirmDelete] = useConfirm(
    "Delete Workspace",
    "This action cannot be undone. All data will be permanently lost.",
    "destructive",
  );

  const [ResetDialog, confirmReset] = useConfirm(
    "Reset Invite Link",
    "This will invalidate the current invite link and generate a new one.",
    "secondary",
  );

  const form = useForm<z.infer<typeof extendedWorkspaceSchema>>({
    resolver: zodResolver(extendedWorkspaceSchema),
    defaultValues: {
      name: initialValues.name,
      description: initialValues.description || "",
    },
  });

  const handleDelete = async () => {
    const ok = await confirmDelete();
    if (!ok) return;
    deleteWorkspace({
      param: { workspaceId: initialValues.$id },
    }, {
      onSuccess: () => {
        toast.success("Workspace deleted successfully");
        window.location.href = "/";
      },
    });
  };

  const handleResetInviteCode = async () => {
    const ok = await confirmReset();
    if (!ok) return;
    resetInviteCode({
      param: { workspaceId: initialValues.$id },
    });
  };

  const onSubmit = (values: z.infer<typeof extendedWorkspaceSchema>) => {
    updateWorkspace({
      form: { name: values.name, description: values.description },
      param: { workspaceId: initialValues.$id }
    }, {
      onSuccess: () => {
        form.reset(values);
      }
    });
  };

  const fullInviteLink = `${origin}/workspaces/${initialValues.$id}/join/${initialValues.inviteCode}`;
  
  const handleCopyInviteLink = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(fullInviteLink)
        .then(() => toast.success("Invite link copied to clipboard"))
        .catch(() => toast.error("Failed to copy invite link"));
    }
  };

  const handleShareInviteLink = () => {
    if (typeof window !== "undefined") {
      if (navigator.share) {
        navigator.share({
          title: `Join ${initialValues.name}`,
          text: `You're invited to join the ${initialValues.name} workspace`,
          url: fullInviteLink,
        });
      } else {
        handleCopyInviteLink();
      }
    }
  };

  return (
    <>
      <DeleteDialog />
      <ResetDialog />
      
      <div className="flex flex-col gap-y-6">
        {/* Header */}
        <Card className="w-full border-none shadow-none">
          <CardHeader className="flex flex-row items-center gap-x-4 p-7 space-y-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={onCancel ? onCancel : () => router.push(`/workspaces/${initialValues.$id}`)}
              className="flex items-center gap-2 hover:bg-slate-100 transition-all duration-200"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <SettingsIcon className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="text-xl font-bold">Workspace Settings</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your workspace configuration and preferences
                </p>
              </div>
            </div>
            {isAdmin && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                <ShieldIcon className="h-3 w-3 mr-1" />
                Administrator
              </Badge>
            )}
          </CardHeader>
        </Card>

        {/* Workspace Overview */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-bold">
                  {initialValues.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{initialValues.name}</h2>
                {initialValues.description && (
                  <p className="text-gray-600 mt-1 text-sm">{initialValues.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <UsersIcon className="h-4 w-4" />
                    <span>{membersData?.total || 0} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Created {format(new Date(initialValues.$createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" />
                    <span>Updated {format(new Date(initialValues.$updatedAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <BrushIcon className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <ShieldIcon className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="danger" className="flex items-center gap-2 text-red-600">
              <AlertTriangleIcon className="h-4 w-4" />
              Danger Zone
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BrushIcon className="h-5 w-5 text-blue-600" />
                  Workspace Information
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Update your workspace name and other basic information
                </p>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Workspace Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter workspace name"
                              className="focus-visible:ring-2 focus-visible:ring-blue-500"
                              disabled={!isAdmin}
                            />
                          </FormControl>
                          <FormDescription>
                            This name will be visible to all workspace members
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Describe your workspace..."
                              className="focus-visible:ring-2 focus-visible:ring-blue-500"
                              disabled={!isAdmin}
                              rows={3}
                            />
                          </FormControl>
                          <FormDescription>
                            Add a description to help members understand the workspace purpose
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    {isAdmin && (
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={isPending || !form.formState.isDirty}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isPending ? (
                            <>
                              <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <CheckIcon className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members & Invitations */}
          <TabsContent value="members" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-green-600" />
                  Invite Members
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Share the invite link to add new members to your workspace
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 rounded-full p-1">
                      <LinkIcon className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900 mb-2">
                        Workspace Invite Link
                      </p>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={fullInviteLink} 
                          readOnly 
                          className="bg-white border-green-200 text-sm font-mono"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCopyInviteLink}
                          className="border-green-200 hover:bg-green-50"
                        >
                          <CopyIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleShareInviteLink}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <ExternalLinkIcon className="h-4 w-4 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={handleResetInviteCode}
                      disabled={isResettingInviteCode}
                      className="border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      {isResettingInviteCode ? (
                        <>
                          <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        <>
                          <RefreshCwIcon className="h-4 w-4 mr-2" />
                          Reset Invite Link
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 rounded-full p-1">
                      <InfoIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        How Invitations Work
                      </p>
                      <p className="text-xs text-blue-700">
                        Anyone with this link can join your workspace as a member. Administrators can manage member roles and permissions after they join.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldIcon className="h-5 w-5 text-purple-600" />
                  Security & Access Control
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage workspace security settings and access permissions
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldIcon className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">Admin Controls</span>
                    </div>
                    <p className="text-xs text-purple-700">
                      Only administrators can modify workspace settings, manage members, and access sensitive features.
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <UsersIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Member Access</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      Regular members can access workspace content and collaborate on projects and tasks.
                    </p>
                  </div>
                </div>

                {/* Future enhancements can be added here */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-center">
                    <ClockIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700 mb-1">Advanced Security Features</p>
                    <p className="text-xs text-gray-500">
                      Two-factor authentication, IP restrictions, and audit logs coming soon
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Danger Zone */}
          <TabsContent value="danger" className="space-y-6">
            {isAdmin ? (
              <Card className="border-red-200 shadow-lg bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-800">
                    <AlertTriangleIcon className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <p className="text-sm text-red-700">
                    These actions are irreversible. Please proceed with caution.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white border border-red-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-red-800">Delete Workspace</h4>
                        <p className="text-sm text-red-600">
                          Permanently delete this workspace and all associated data including projects, tasks, and member information.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="destructive" className="text-xs">
                            Permanent Action
                          </Badge>
                          <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                            Data Loss
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeletingWorkspace}
                        className="ml-4"
                      >
                        {isDeletingWorkspace ? (
                          <>
                            <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Delete Workspace
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-gray-200 shadow-lg">
                <CardContent className="p-8 text-center">
                  <ShieldIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Administrator Access Required</h3>
                  <p className="text-sm text-gray-500">
                    Only workspace administrators can access dangerous operations like deleting the workspace.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};
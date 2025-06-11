"use client"

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updateWorkspaceSchema } from "../schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { DottedSeparator } from "@/components/dotted-separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Workspace } from "../types";
import { ArrowLeftIcon, CopyIcon } from "lucide-react";
import { useUpdateWorkspace } from "../api/use-update-workspace";
import { useConfirm } from "@/hooks/use-confirm";
import { useDeleteWorkspace } from "../api/use-delete-workspace";
import { toast } from 'sonner';
import { useResetInviteCode } from "../api/use-reset-invite-code";



interface EditWorkspaceFormProps {
  onCancel?: () => void;
  initialValues: Workspace;
}

export const EditWorkspaceForm = ({ onCancel, initialValues }: EditWorkspaceFormProps) => {
  const router = useRouter();
  const { mutate, isPending } = useUpdateWorkspace();
  const {
    mutate: deleteWorkspace,
    isPending: isDeletingWorkspace
  } = useDeleteWorkspace();

  const {
    mutate: resetInviteCode,
    isPending: isResettingInviteCode
  } = useResetInviteCode();

  const [DeleteDialog, confirmDelete] = useConfirm(
    "Delete Workspace",
    "This action cannot be undone.",
    "secondary",
  );

  const [ResetDialog, confirmReset] = useConfirm(
    "Reset invite link",
    "This will invalidate the current invite link",
    "secondary",
  );


  const form = useForm<z.infer<typeof updateWorkspaceSchema>>({
    resolver: zodResolver(updateWorkspaceSchema),
    defaultValues: {
      ...initialValues,
    },
  });

  const handleDelete = async () => {
    const ok = await confirmDelete();
    if (!ok) return;
    deleteWorkspace({
      param: { workspaceId: initialValues.$id },
    }, {
      onSuccess: () => {
        window.location.href = "/";
      },
    });
  }

  const handleResetInviteCode = async () => {
    const ok = await confirmReset();
    if (!ok) return;
    resetInviteCode({
      param: { workspaceId: initialValues.$id },
    });
  }

  const onSubmit = (values: z.infer<typeof updateWorkspaceSchema>) => {
    const finalValues = {
      ...values,
    };

    mutate({
      form: finalValues,
      param: { workspaceId: initialValues.$id }
    }, {
      onSuccess: () => {
        form.reset();
      }
    });

  };

  const fullInviteLink = `${window.location.origin}/workspaces/${initialValues.$id}/join/${initialValues.inviteCode}`
  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(fullInviteLink)
      .then(() => toast.success("Invite link copy to clipboard"))
  }

  return (
    <div className="flex flex-col gap-y-4">
      <DeleteDialog />
      <ResetDialog />
      <Card className="w-full h-full border-none shadow-none">
        <CardHeader className="flex flex-row items-center gap-x-4 p-6 sm:p-7 space-y-0 border-b">
          <Button
            size="sm"
            variant="secondary"
            onClick={onCancel ? onCancel : () => router.push(`/workspaces/${initialValues.$id}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back
          </Button>
          <CardTitle className="text-xl font-semibold truncate">
            {initialValues.name}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 sm:p-7">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-muted-foreground">
                        Workspace Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter workspace name"
                          className="focus-visible:ring-2 focus-visible:ring-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-muted-foreground">
                        Description (Optional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter workspace description"
                          rows={3}
                          className="focus-visible:ring-2 focus-visible:ring-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DottedSeparator />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  onClick={onCancel}
                  disabled={isPending || isDeletingWorkspace}
                  className={cn(!onCancel && "invisible", "w-full sm:w-auto")}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isPending || isDeletingWorkspace}
                  className="w-full sm:w-auto"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="w-full h-full border-none shadow-none">
        <CardContent className="p-7 h-full flex flex-col justify-between">
          <div className="space-y-2 sm:max-w-md">
            <h3 className="font-bold text-base">Invite Members</h3>
            <p className="text-sm text-muted-foreground">
              Use the invite link to add members to your workspace.
            </p>
            <div className="flex items-center gap-x-2 mt-2">
              <Input disabled value={fullInviteLink} className="truncate" />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleCopyInviteLink}
              >
                <CopyIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex justify-end mt-6 self-end">
            <Button
              className="mt-4 sm:mt-0 sm:ml-4 w-fit"
              size="sm"
              variant="secondary"
              disabled={isPending || isResettingInviteCode}
              onClick={handleResetInviteCode}
            >
              Reset Invite Link
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full h-full border-none shadow-none">
        <CardContent className="p-7">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="font-bold text-red-600">Danger Zone</h3>
              <p className="text-sm text-muted-foreground">
                Deleting a workspace is a permanent action and will result in the loss of all associated data.
              </p>
            </div>
            <Button
              className="mt-4 sm:mt-0 sm:ml-4 w-fit"
              size="sm"
              variant="secondary"
              disabled={isPending || isDeletingWorkspace}
              onClick={handleDelete}
            >
              Delete Workspace
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );

};

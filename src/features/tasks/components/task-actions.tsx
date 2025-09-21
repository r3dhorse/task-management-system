import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArchiveIcon, ExternalLinkIcon } from "@/lib/lucide-icons";
import { useConfirm } from "@/hooks/use-confirm";
import { useDeleteTask } from "../api/use-delete-task";
import { useCreateTaskHistory } from "../api/use-create-task-history";
import { TaskHistoryAction } from "../types/history";
import { useRouter } from "next/navigation";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useCurrent } from "@/features/auth/api/use-current";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { Member, MemberRole } from "@/features/members/types";

interface TaskActionsProps {
  id: string;
  serviceId: string;
  children: React.ReactNode;
  deleteOnly?: boolean;
  creatorId?: string; // Task creator's user ID
  assigneeId?: string; // Task assignee's member ID
  status?: string; // Task status to determine if already archived or done
};

export const TaskActions = ({ id, serviceId, children, deleteOnly = false, status, creatorId, assigneeId }: TaskActionsProps) => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();

  // Get current user and member information
  const { data: currentUser } = useCurrent();
  const { data: members } = useGetMembers({ workspaceId });

  // Find current user's member record to check role
  const currentMember = members?.documents.find(member =>
    (member as Member).userId === currentUser?.id
  ) as Member;

  // Check permissions
  const isWorkspaceAdmin = currentMember?.role === MemberRole.ADMIN;
  const isCreator = currentUser?.id === creatorId;
  const isAssignee = currentMember?.id === assigneeId;
  const isSuperAdmin = currentUser?.isSuperAdmin || false;

  // For DONE tasks, only admins can archive
  // For other tasks, creator, assignee, or admin can archive (matching the task details page logic)
  const isDoneStatus = status === "DONE";
  const canArchive = isDoneStatus
    ? (isWorkspaceAdmin || isSuperAdmin)
    : (isCreator || isAssignee || isWorkspaceAdmin || isSuperAdmin);
  const isAlreadyArchived = status === "ARCHIVED";

  const [ConfirmDialog, confirm] = useConfirm(
    "Archive Task",
    "This task will be archived and moved out of active views. You can still access it by filtering for 'Archived' tasks.",
    "destructive"
  )

  const { mutate, isPending } = useDeleteTask();
  const { mutate: createHistory } = useCreateTaskHistory();

  const onArchive = async () => {
    const ok = await confirm();
    if (!ok) return;

    mutate(
      { param: { taskId: id } },
      {
        onSuccess: () => {
          // Log archive action to task history
          createHistory({
            json: {
              taskId: id,
              action: TaskHistoryAction.ARCHIVED,
              details: "Task archived by user"
            }
          });
        }
      }
    );
  }

  const onOpenTask = () => {
    router.push(`/workspaces/${workspaceId}/tasks/${id}`);
  };

  const onOpenService = () => {
    router.push(`/workspaces/${workspaceId}/services/${serviceId}`);
  };


  return (
    <div className="flex justify-end" data-testid="task-actions">
      <ConfirmDialog />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {!deleteOnly && (
            <>
              <DropdownMenuItem
                onClick={onOpenTask}
                className="font-medium p-[10px]"
              >
                <ExternalLinkIcon className="size-4 mr-2 stroke-2" />
                Task Details
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={onOpenService}
                className="font-medium p-[10px]"
              >
                <ExternalLinkIcon className="size-4 mr-2 stroke-2" />
                Open Service
              </DropdownMenuItem>
            </>
          )}

          {canArchive && !isAlreadyArchived && (
            <DropdownMenuItem
              onClick={onArchive}
              disabled={isPending}
              className="text-orange-700 focus:text-orange-700 font-medium p-[10px]"
            >
              <ArchiveIcon className="size-4 mr-2 stroke-2" />
              Archive Task
            </DropdownMenuItem>
          )}

        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

"use client";

import { useGetServices } from "@/features/services/api/use-get-services";
import { useDeleteService } from "@/features/services/api/use-delete-service";
import { RiAddCircleFill } from "react-icons/ri";
import { MoreVertical } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useServiceId } from "@/features/services/hooks/use-service-id";
import { useCreateServiceModal } from "@/features/services/hooks/use-create-service-modal";
import { useConfirm } from "@/hooks/use-confirm";
import { useRouter } from "next/navigation";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useCurrent } from "@/features/auth/api/use-current";
import { MemberRole, Member } from "@/features/members/types";

export const ServiceSwitcher = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const currentServiceId = useServiceId();
  const { data: services, isLoading, isError } = useGetServices({ 
    workspaceId,
  }, {
    enabled: !!workspaceId, // Only fetch when workspaceId is available
  });
  const { open } = useCreateServiceModal();
  const { mutate: deleteService } = useDeleteService();
  
  // Check if current user is workspace admin
  const { data: currentUser } = useCurrent();
  const { data: membersData } = useGetMembers({ workspaceId });
  const currentMember = membersData?.documents?.find(member => 
    (member as Member).userId === currentUser?.id
  ) as Member;
  const isWorkspaceAdmin = currentMember?.role === MemberRole.ADMIN;

  const [DeleteDialog, confirmDelete] = useConfirm(
    "Delete Service",
    "This action cannot be undone.",
    "destructive",
  );

  const handleEdit = (serviceId: string) => {
    router.push(`/workspaces/${workspaceId}/services/${serviceId}/settings`);
  };

  const handleDelete = async (serviceId: string, _serviceName: string) => {
    const ok = await confirmDelete();
    if (!ok) return;

    deleteService({
      param: { serviceId },
    }, {
      onSuccess: () => {
        if (currentServiceId === serviceId) {
          router.push(`/workspaces/${workspaceId}`);
        }
      }
    });
  };

  return (
    <div className="flex flex-col gap-y-2">
      <DeleteDialog />
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase text-neutral-700 tracking-wide">Services</p>
        {isWorkspaceAdmin && (
          <RiAddCircleFill 
            onClick={open} 
            className="size-7 text-blue-600 cursor-pointer hover:text-blue-700 hover:scale-110 transition-all duration-200" 
          />
        )}
      </div>

      {isLoading ? (
        <div className="w-full h-9 rounded bg-neutral-100 flex items-center justify-center">
          <LoadingSpinner variant="minimal" size="sm" />
        </div>
      ) : isError ? (
        <div className="p-2 text-center">
          <p className="text-sm text-red-500 mb-1">Failed to load services</p>
          <p className="text-xs text-gray-500">
            {!workspaceId ? "No workspace selected" : "Check your permissions"}
          </p>
        </div>
      ) : (
        <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100">





          <div className="space-y-2 pr-1">
            {services?.documents?.length ? (
              services.documents.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-2 bg-neutral-50 rounded-md border hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold uppercase">
                      {service.name.charAt(0)}
                    </div>
                    <span className="text-xs font-medium">{service.name}</span>
                  </div>
                  {isWorkspaceAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-neutral-200"
                        >
                          <MoreVertical className="h-3 w-3 text-neutral-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem 
                          onClick={() => handleEdit(service.id)}
                          className="text-xs cursor-pointer"
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(service.id, service.name)}
                          className="text-xs cursor-pointer text-red-600 focus:text-red-600"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))
            ) : (
              <div className="p-2 text-sm text-neutral-500 text-center">
                No services available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
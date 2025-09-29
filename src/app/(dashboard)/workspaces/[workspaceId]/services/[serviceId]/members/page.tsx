import { getCurrent } from "@/features/auth/queries";
import { getService } from "@/features/services/queries";
import { MembersList } from "@/features/workspaces/components/members-list";
import { redirect } from "next/navigation";

interface ServiceMembersPageProps {
  params: { 
    workspaceId: string;
    serviceId: string;
  }
}

const ServiceMembersPage = async ({
  params,
}: ServiceMembersPageProps) => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  try {
    const service = await getService({
      serviceId: params.serviceId,
    });

    if (!service) {
      redirect(`/workspaces/${params.workspaceId}`);
    }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center gap-x-2">
        {/* Service Avatar */}
        <div className="w-9 h-9 flex items-center justify-center rounded-3xl bg-blue-900 text-neutral-200 text-xl font-bold">
          {service.name.charAt(0).toUpperCase()}
        </div>
        
        {/* Service Name */}
        <div>
          <h1 className="text-lg font-semibold">{service.name}</h1>
          <p className="text-sm text-muted-foreground">Service Members</p>
        </div>
      </div>
      
      {/* Members List - Shows workspace members who can access this service */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          All workspace members have access to this service. Manage workspace members to control service access.
        </p>
        <MembersList />
      </div>
    </div>
    );
  } catch {
    redirect(`/workspaces/${params.workspaceId}`);
  }
};

export default ServiceMembersPage;
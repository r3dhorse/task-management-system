import { getCurrent } from "@/features/auth/queries";
import { getService } from "@/features/services/queries";
import { redirect } from "next/navigation";
import { ServiceTasksClient } from "./client";

interface ServiceTasksPageProps {
  params: { 
    workspaceId: string;
    serviceId: string;
  }
}

const ServiceTasksPage = async ({
  params,
}: ServiceTasksPageProps) => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  try {
    const service = await getService({
      serviceId: params.serviceId,
    });

    if (!service) {
      redirect(`/workspaces/${params.workspaceId}`);
    }

    return <ServiceTasksClient service={service} />;
  } catch {
    redirect(`/workspaces/${params.workspaceId}`);
  }
};

export default ServiceTasksPage;
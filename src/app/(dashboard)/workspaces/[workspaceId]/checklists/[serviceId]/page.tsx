import { getCurrent } from "@/features/auth/queries";
import { getService } from "@/features/services/queries";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ClipboardList, Package } from "@/lib/lucide-icons";
import Link from "next/link";
import { ChecklistManager } from "@/features/checklists/components/checklist-manager";

interface ServiceChecklistPageProps {
  params: {
    workspaceId: string;
    serviceId: string;
  };
}

const ServiceChecklistPage = async ({ params }: ServiceChecklistPageProps) => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  try {
    const service = await getService({ serviceId: params.serviceId });

    if (!service) {
      redirect(`/workspaces/${params.workspaceId}/checklists`);
    }

    return (
      <div className="flex flex-col gap-y-6">
        {/* Header */}
        <Card className="w-full border-none shadow-none">
          <CardHeader className="flex flex-row items-center gap-x-4 p-7 space-y-0">
            <Button asChild size="sm" variant="secondary">
              <Link href={`/workspaces/${params.workspaceId}/checklists`}>
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Checklists
              </Link>
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <ClipboardList className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold">Service Checklist</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage checklist items for this service
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Service Overview */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 flex items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-bold">
                {service.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{service.name}</h2>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                  <Package className="h-4 w-4" />
                  <span>Checklist Template</span>
                  {service.isRoutinary && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium ml-2">
                      Routinary Service
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checklist Manager */}
        <ChecklistManager serviceId={params.serviceId} serviceName={service.name} />
      </div>
    );
  } catch {
    redirect(`/workspaces/${params.workspaceId}/checklists`);
  }
};

export default ServiceChecklistPage;

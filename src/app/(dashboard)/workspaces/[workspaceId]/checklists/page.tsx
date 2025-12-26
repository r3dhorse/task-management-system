"use client";

import { useState } from "react";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetServices } from "@/features/services/api/use-get-services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Package, ChevronRight, CheckCircle, AlertCircle } from "@/lib/lucide-icons";
import Link from "next/link";
import { Loader2 } from "@/lib/lucide-icons";
import { useGetChecklist } from "@/features/checklists/api/use-get-checklist";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 4;

interface ServiceChecklistCardProps {
  service: {
    id: string;
    name: string;
    isRoutinary: boolean;
  };
  workspaceId: string;
}

const ServiceChecklistCard = ({ service, workspaceId }: ServiceChecklistCardProps) => {
  const { data: checklist, isLoading } = useGetChecklist({ serviceId: service.id });

  const hasChecklist = !!checklist;
  // Count items across all sections
  const itemCount = checklist?.sections?.reduce((total, section) => total + (section.items?.length ?? 0), 0) ?? 0;

  return (
    <Link href={`/workspaces/${workspaceId}/checklists/${service.id}`} className="block">
      <Card className="hover:shadow-md transition-shadow cursor-pointer border-gray-200 hover:border-blue-300">
        <CardContent className="py-5 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                {service.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{service.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : hasChecklist ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                      <span>No checklist</span>
                    </>
                  )}
                  {service.isRoutinary && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Routinary
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

const ChecklistsPage = () => {
  const workspaceId = useWorkspaceId();
  const { data: services, isLoading } = useGetServices({ workspaceId });
  const [page, setPage] = useState(1);

  const allServices = services?.documents ?? [];
  const totalPages = Math.ceil(allServices.length / ITEMS_PER_PAGE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedServices = allServices.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col gap-y-6">
      {/* Header */}
      <Card className="w-full border-none shadow-none">
        <CardHeader className="flex flex-row items-center gap-x-4 p-7 space-y-0">
          <div className="flex items-center gap-3 flex-1">
            <ClipboardList className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold">Service Checklists</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage checklist templates for your services. Checklists are automatically added to routinary tasks.
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Info Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <Package className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">How Checklists Work</h2>
              <p className="text-sm text-gray-600 mt-1">
                Create a checklist for any service, and when a routinary task is generated,
                the checklist items will be copied to the task. Team members can then mark items
                as complete while working on the task.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Services
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Select a service to create or edit its checklist
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : allServices.length > 0 ? (
            <>
              {/* Pagination info */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, allServices.length)} of {allServices.length} services
                </span>
                {totalPages > 1 && (
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                )}
              </div>

              {/* Services */}
              <div className="space-y-5">
                {paginatedServices.map((service) => (
                  <ServiceChecklistCard
                    key={service.id}
                    service={service}
                    workspaceId={workspaceId}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>

                      {/* Page Numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                        const showPage = pageNum === 1 ||
                                       pageNum === totalPages ||
                                       Math.abs(pageNum - currentPage) <= 1;

                        if (!showPage) {
                          if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                            return (
                              <PaginationItem key={pageNum}>
                                <span className="px-2 text-muted-foreground">...</span>
                              </PaginationItem>
                            );
                          }
                          return null;
                        }

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No services found</p>
              <p className="text-sm mt-1">Create a service first to add checklists</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChecklistsPage;

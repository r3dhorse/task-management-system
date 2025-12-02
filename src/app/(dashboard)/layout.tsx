import dynamic from "next/dynamic";
import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";

// Lazy load modals - they're only needed when opened
const CreateWorkspaceModal = dynamic(
  () => import("@/features/workspaces/components/create-workspace-modal").then(mod => ({ default: mod.CreateWorkspaceModal })),
  { ssr: false }
);
const CreateServiceModal = dynamic(
  () => import("@/features/services/components/create-service-modal").then(mod => ({ default: mod.CreateServiceModal })),
  { ssr: false }
);
const CreateTaskModal = dynamic(
  () => import("@/features/tasks/components/create-task-modal").then(mod => ({ default: mod.CreateTaskModal })),
  { ssr: false }
);
const EditTaskModal = dynamic(
  () => import("@/features/tasks/components/edit-task-modal").then(mod => ({ default: mod.EditTaskModal })),
  { ssr: false }
);
const CreatedTasksModal = dynamic(
  () => import("@/features/tasks/components/created-tasks-modal").then(mod => ({ default: mod.CreatedTasksModal })),
  { ssr: false }
);

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen">
      <CreateWorkspaceModal />
      <CreateServiceModal />
      <CreateTaskModal />
      <EditTaskModal />
      <CreatedTasksModal />
      <div className="flex w-full h-full">
        <div className="fixed left-0 top-0 hidden lg:block lg:w-[264px] h-full overflow-auto">
          <Sidebar />
        </div>
        <div className="lg:pl-[264px] w-full">
          <div className="lg:hidden">
            <Navbar />
          </div>
          <div className="mx-auto max-w-screen-2xl h-full px-4">
            <main className="h-full py-4 flex flex-col">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;

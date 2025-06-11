import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
import { CreateServiceModal } from "@/features/services/components/create-service-modal";
import { CreateTaskModal } from "@/features/tasks/components/create-task-modal";
import { EditTaskModal } from "@/features/tasks/components/edit-task-modal";
import { CreateWorkspaceModal } from "@/features/workspaces/components/create-workspace-modal";

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

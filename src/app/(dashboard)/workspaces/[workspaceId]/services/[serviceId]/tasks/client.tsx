"use client";

import { TaskViewSwitcher } from "@/features/tasks/components/task-view-switcher";

interface ServiceTasksClientProps {
  service: {
    name: string;
  };
}

export const ServiceTasksClient = ({ service }: ServiceTasksClientProps) => {
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
          <p className="text-sm text-muted-foreground">Service Tasks</p>
        </div>
      </div>
      
      {/* Task Management Interface */}
      <TaskViewSwitcher />
    </div>
  );
};
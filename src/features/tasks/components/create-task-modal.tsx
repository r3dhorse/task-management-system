"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { useCreateTaskModal } from "../hooks/use-create-task-modal";
import { CreateTaskFormWrapper } from "./create-task-form-wrapper";

export const CreateTaskModal = () => {
  const { isOpen, setIsOpen, close, parentTaskId, options } = useCreateTaskModal();

  // Allow closing via X button, escape key, or programmatic closing
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      close(); // Use the close function to properly handle modal closing
    } else {
      setIsOpen(open);
    }
  };

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      disableOutsideClick={true}
      title="Create Task"
      hideTitle={true}
    >
      <CreateTaskFormWrapper
        onCancel={close}
        parentTaskId={parentTaskId || options.parentTaskId}
        initialWorkspaceId={options.workspaceId}
        initialServiceId={options.serviceId}
        onSuccess={options.onSuccess}
      />
    </ResponsiveModal>
  );
};
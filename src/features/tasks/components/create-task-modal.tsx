"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { useCreateTaskModal } from "../hooks/use-create-task-modal";
import { CreateTaskFormWrapper } from "./create-task-form-wrapper";

export const CreateTaskModal = () => {
  const { isOpen, setIsOpen, close } = useCreateTaskModal();

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
    >
      <CreateTaskFormWrapper onCancel={close}/>
    </ResponsiveModal>
  );
};
"use client";

import { useState, useCallback } from "react";
import { ResponsiveModal } from "@/components/responsive-modal";
import { useCreateTaskModal } from "../hooks/use-create-task-modal";
import { CreateTaskFormWrapper } from "./create-task-form-wrapper";
import { CreateTaskFormFooter } from "./create-task-form";

export const CreateTaskModal = () => {
  const { isOpen, setIsOpen, close, parentTaskId, options } = useCreateTaskModal();

  // Track form actions for the external footer
  const [formActions, setFormActions] = useState<{
    submit: () => void;
    isPending: boolean;
  } | null>(null);

  // Callback to receive form actions
  const handleFormReady = useCallback((actions: { submit: () => void; isPending: boolean }) => {
    setFormActions(actions);
  }, []);

  // Allow closing via X button, escape key, or programmatic closing
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      close(); // Use the close function to properly handle modal closing
      setFormActions(null); // Reset form actions when modal closes
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
      footer={
        formActions && (
          <CreateTaskFormFooter
            onSubmit={formActions.submit}
            onCancel={close}
            isPending={formActions.isPending}
          />
        )
      }
    >
      <CreateTaskFormWrapper
        onCancel={close}
        parentTaskId={parentTaskId || options.parentTaskId}
        initialWorkspaceId={options.workspaceId}
        initialServiceId={options.serviceId}
        onSuccess={options.onSuccess}
        onFormReady={handleFormReady}
      />
    </ResponsiveModal>
  );
};
"use client";

import { useState, useCallback } from "react";
import { ResponsiveModal } from "@/components/responsive-modal";
import { EditTaskFormWrapper } from "./edit-task-form-wrapper";
import { EditTaskFormFooter } from "./edit-task-form";
import { useEditTaskModal } from "../hooks/use-edit-task-modal";

export const EditTaskModal = () => {
  const { taskId, close } = useEditTaskModal();

  // Track form actions for the external footer
  const [formActions, setFormActions] = useState<{
    submit: () => void;
    isPending: boolean;
  } | null>(null);

  // Callback to receive form actions
  const handleFormReady = useCallback((actions: { submit: () => void; isPending: boolean }) => {
    setFormActions(actions);
  }, []);

  // Reset form actions when modal closes
  const handleClose = () => {
    setFormActions(null);
    close();
  };

  return (
    <ResponsiveModal
      open={!!taskId}
      onOpenChange={(open) => !open && handleClose()}
      disableOutsideClick={true}
      title="Edit Task"
      hideTitle={true}
      footer={
        formActions && (
          <EditTaskFormFooter
            onSubmit={formActions.submit}
            onCancel={handleClose}
            isPending={formActions.isPending}
          />
        )
      }
    >
      {taskId && (
        <EditTaskFormWrapper
          id={taskId}
          onCancel={handleClose}
          onFormReady={handleFormReady}
        />
      )}
    </ResponsiveModal>
  );
};
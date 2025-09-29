"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { ChangePasswordForm } from "./change-password-form";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal = ({ isOpen, onClose }: ChangePasswordModalProps) => {
  return (
    <ResponsiveModal open={isOpen} onOpenChange={onClose} disableOutsideClick={true}>
      <ChangePasswordForm onCancel={onClose} />
    </ResponsiveModal>
  );
};
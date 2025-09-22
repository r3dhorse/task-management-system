import { useQueryState, parseAsBoolean, parseAsString } from "nuqs";
import { useState } from "react";

interface CreateTaskOptions {
  workspaceId?: string;
  serviceId?: string;
  parentTaskId?: string;
  onSuccess?: (task: unknown) => void;
}

export const useCreateTaskModal = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "create-task",
    parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true })
  );

  const [parentTaskId, setParentTaskId] = useQueryState(
    "parent-task",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );

  const [options, setOptions] = useState<CreateTaskOptions>({});

  const open = (opts?: CreateTaskOptions) => {
    if (opts) {
      setOptions(opts);
      if (opts.parentTaskId) {
        setParentTaskId(opts.parentTaskId);
      }
    }
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setParentTaskId("");
    setOptions({});
  };

  return {
    isOpen,
    open,
    close,
    setIsOpen,
    parentTaskId,
    options,
  };
};
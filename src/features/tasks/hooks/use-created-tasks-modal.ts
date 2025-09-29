import { useQueryState, parseAsBoolean } from "nuqs";

export const useCreatedTasksModal = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "created-tasks",
    parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true })
  );

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return {
    isOpen,
    open,
    close,
    setIsOpen,
  };
};
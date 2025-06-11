import { useQueryState, parseAsBoolean } from "nuqs";

export const useCreateServiceModal = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "create-service",
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
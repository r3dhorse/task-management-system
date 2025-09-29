import { useParams } from "next/navigation";

export const useServiceId = () => {
  const params = useParams();
  return params.serviceId as string;
};
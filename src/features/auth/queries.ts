import { getCurrentUser } from "@/lib/auth-utils";

export const getCurrent = async () => {
  return await getCurrentUser();
};
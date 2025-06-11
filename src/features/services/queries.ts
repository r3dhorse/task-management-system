import { createSessionClient } from "@/lib/appwrite";
import { getMember } from "../members/utils";
import { DATABASE_ID, SERVICES_ID } from "@/config";
import { Service } from "./types";

interface GetServiceProps {
  serviceId: string;
};

export const getService = async ({ serviceId }: GetServiceProps) => {
  const { databases, account } = await createSessionClient();
  const user = await account.get();

  const service = await databases.getDocument<Service>(
    DATABASE_ID,
    SERVICES_ID,
    serviceId,
  );

  const member = await getMember({
    databases,
    userId: user.$id,
    workspaceId: service.workspaceId,
  })

  if (!member) {
    throw new Error("Unauthorized");
  }

  return service;
};
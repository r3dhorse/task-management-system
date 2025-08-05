import { requireSuperAdmin } from "@/lib/auth-utils";
import { UserManagementClient } from "./client";

export default async function UsersPage() {
  await requireSuperAdmin();

  return <UserManagementClient />;
}
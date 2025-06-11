import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries";
import { MyTasksClient } from "./client";

const MyTasksPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return <MyTasksClient />;
};

export default MyTasksPage;
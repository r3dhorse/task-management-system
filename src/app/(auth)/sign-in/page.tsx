import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { ReadyForWorkLogin } from "@/features/auth/components/ready-for-work-login";

export const dynamic = 'force-dynamic';

const SignInPage = async () => {
  const user = await getCurrent();

  if (user) redirect("/");

  return <ReadyForWorkLogin />

};

export default SignInPage;
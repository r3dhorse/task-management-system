import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DottedSeparator } from "@/components/dotted-separator";
import { LogoutButton } from "./logout-button";
import { RefreshButton } from "./refresh-button";
import { WorkspaceActions } from "./workspace-actions";
import { UserButton } from "@/features/auth/components/user-button";
import { CheckCircle, Users, Mail, Shield } from "@/lib/lucide-icons";
import { isAdminUser } from "@/features/auth/utils";

export const dynamic = 'force-dynamic';

const NoWorkspacePage = async () => {
  const user = await getCurrent();
  if (!user) { redirect("/sign-in"); }

  const isAdmin = isAdminUser(user);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Welcome Card */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900">
              Welcome to Task Management
            </h1>
            <CardDescription className="text-lg text-neutral-600 mt-2">
              You&apos;re successfully signed in as <span className="font-medium text-neutral-900">{user.name}</span>
              {isAdmin && (
                <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <Shield className="w-3 h-3" />
                  Admin
                </span>
              )}
            </CardDescription>
          </CardHeader>
          
          <DottedSeparator className="px-6" />
          
          <CardContent className="pt-6 space-y-6">
            {/* Status Section */}
            {isAdmin ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-blue-900 mb-1">
                      Administrator Access
                    </h2>
                    <p className="text-blue-800 text-sm leading-relaxed">
                      As an administrator, you can create new workspaces. Click the button below to get started with your first workspace.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mail className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-amber-900 mb-1">
                      Workspace Access Pending
                    </h2>
                    <p className="text-amber-800 text-sm leading-relaxed">
                      You&apos;re not currently a member of any workspace. To get started, you&apos;ll need to be invited by an administrator.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="space-y-4">
              <h2 className="font-semibold text-neutral-900 text-lg">
                {isAdmin ? "Get Started" : "What happens next?"}
              </h2>
              <div className="space-y-3">
                {isAdmin ? (
                  <>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-neutral-700">
                        <span className="font-medium">Create your first workspace</span> to organize your team&apos;s projects
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-neutral-700">
                        <span className="font-medium">Invite team members</span> to collaborate on tasks
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-neutral-700">
                        <span className="font-medium">Set up services</span> to organize work by departments or teams
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-neutral-700">
                        <span className="font-medium">Contact your administrator</span> to request workspace access
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-neutral-700">
                        <span className="font-medium">Wait for an invitation</span> to be sent to your email
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-neutral-700">
                        <span className="font-medium">Refresh this page</span> once you&apos;ve been added to a workspace
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <DottedSeparator />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <WorkspaceActions user={user} />
              <RefreshButton />
              <div className="flex items-center gap-3">
                <LogoutButton />
                <UserButton />
              </div>
            </div>

            {/* Help Text */}
            <div className="text-center pt-4">
              <p className="text-xs text-neutral-500">
                {isAdmin 
                  ? "As an administrator, you have full control to create and manage workspaces."
                  : "Need help? Contact your system administrator for workspace access."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NoWorkspacePage;
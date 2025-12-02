import { Suspense } from "react";
import { ResetPasswordContent } from "./reset-password-content";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const dynamic = 'force-dynamic';

const ResetPasswordPage = () => {
  return (
    <Suspense fallback={
      <Card className="w-full h-full md:w-[480px] border border-gray-200 shadow-lg bg-white">
        <CardContent className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
};

export default ResetPasswordPage;

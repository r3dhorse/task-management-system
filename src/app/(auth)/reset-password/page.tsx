"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { resetPasswordSchema } from "@/features/auth/schemas";
import { useResetPassword } from "@/features/auth/api/use-reset-password";
import { AlertTriangle } from "@/lib/lucide-icons";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ResetPasswordPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isValidLink, setIsValidLink] = useState(false);
  
  const userId = searchParams.get("userId");
  const secret = searchParams.get("secret");
  
  const { mutate, isPending } = useResetPassword();

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      userId: userId || "",
      secret: secret || "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!userId || !secret) {
      setIsValidLink(false);
    } else {
      setIsValidLink(true);
      form.setValue("userId", userId);
      form.setValue("secret", secret);
    }
  }, [userId, secret, form]);

  const onSubmit = (values: z.infer<typeof resetPasswordSchema>) => {
    mutate({ json: values });
  };

  if (!isValidLink) {
    return (
      <Card className="w-full h-full md:w-[480px] border border-gray-200 shadow-lg bg-white">
        <CardHeader className="text-center pt-12 pb-8">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Invalid Reset Link
          </CardTitle>
          <CardDescription className="mt-2">
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-12">
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Password reset links are only valid for a limited time. Please request a new password reset link.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => router.push("/sign-in")}
            className="w-full"
          >
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full md:w-[480px] border border-gray-200 shadow-lg bg-white">
      <CardHeader className="text-center pt-12 pb-8">
        <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
          Reset Your Password
        </CardTitle>
        <CardDescription>
          Enter your new password below
        </CardDescription>
      </CardHeader>

      <CardContent className="px-8 pb-12">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Enter new password"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Confirm new password"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={isPending}
                size="lg"
                className="w-full"
              >
                {isPending ? "Resetting..." : "Reset Password"}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/sign-in")}
                disabled={isPending}
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ResetPasswordPage;
"use client";

import { useState } from "react";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { loginSchema } from "../schemas";
import { useLogin } from "../api/use-login";
import { ForgotPasswordModal } from "./forgot-password-modal";


export const SignInCard = () => {
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { mutate, isPending } = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    mutate({ json: values });
  };

  return (
    <Card className="w-full h-full md:w-[480px] border border-gray-200 shadow-lg bg-white">
      <CardHeader className="flex items-center justify-center text-center pt-12 pb-8">
        <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back
        </CardTitle>
        <p className="text-gray-600 text-base">
          Sign in to your account to continue
        </p>
      </CardHeader>

      <CardContent className="px-8 pb-12">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              name="email"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="Email address"
                      autoComplete="email"
                      className="h-12 px-4 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="password"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Password"
                      autoComplete="current-password"
                      className="h-12 px-4 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              disabled={isPending}
              type="submit"
              size="lg"
              className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {isPending ? "Signing in..." : "Sign in"}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Forgot your password?
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>

      <ForgotPasswordModal
        open={showForgotPassword}
        onOpenChange={setShowForgotPassword}
      />
    </Card>
  );
};
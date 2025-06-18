"use client";

import { useState, useEffect } from "react";
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
  const [isVisible, setIsVisible] = useState(false);
  const { mutate, isPending } = useLogin();

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
    <Card className={`w-full h-full md:w-[480px] border border-white/20 shadow-2xl bg-white/10 backdrop-blur-lg backdrop-saturate-150 transform transition-all duration-700 ease-out ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}`}>
      <CardHeader className="flex items-center justify-center text-center pt-12 pb-8">
        <CardTitle className="text-3xl font-bold text-white mb-2 drop-shadow-sm">
          Welcome back
        </CardTitle>
        <p className="text-white/80 text-base drop-shadow-sm">
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
                  <FormLabel className="text-white/90 font-medium">Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="Email address"
                      autoComplete="email"
                      className="h-12 px-4 text-base bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 focus:ring-white/25 backdrop-blur-sm transition-all duration-200 hover:bg-white/25 focus:bg-white/25"
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
                  <FormLabel className="text-white/90 font-medium">Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Password"
                      autoComplete="current-password"
                      className="h-12 px-4 text-base bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 focus:ring-white/25 backdrop-blur-sm transition-all duration-200 hover:bg-white/25 focus:bg-white/25"
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
              className="w-full h-12 text-base font-semibold bg-white/20 hover:bg-white/30 active:bg-white/40 text-white border border-white/30 focus:ring-2 focus:ring-white/25 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 backdrop-blur-sm disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Signing in...
                </div>
              ) : "Sign in"}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-white/80 hover:text-white transition-all duration-200 hover:underline underline-offset-2"
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
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
import { Eye, EyeOff } from "@/lib/lucide-icons";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { loginSchema } from "../schemas";
import { useLogin } from "../api/use-login";
import { ForgotPasswordModal } from "./forgot-password-modal";
import styles from "./sign-in-card.module.css";


export const SignInCard = () => {
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { mutate, isPending } = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    setIsVisible(true);
    // Auto-focus on email input after animation starts
    const focusTimer = setTimeout(() => {
      form.setFocus("email");
    }, 100);
    return () => clearTimeout(focusTimer);
  }, [form]);

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    mutate({ json: values });
  };

  return (
    <div className={`w-full h-full md:w-[480px] ${styles.animatedCard} transform transition-all duration-700 ease-out ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}`}>
      <Card className={`${styles.cardContent} w-full h-full border-none shadow-none bg-transparent`}>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="signin-form">
            <FormField
              name="email"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/90 font-medium">Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="Email address"
                      autoComplete="email"
                      tabIndex={1}
                      data-testid="email-input"
                      className={`${styles.glassmorphismInput} h-12 px-4 text-base text-white placeholder:text-white/70 focus:ring-0 focus:ring-offset-0 ${
                        form.formState.errors.email ? 'border-red-400/60 focus:border-red-400/80 !bg-red-500/10' : ''
                      }`}
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
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        autoComplete="current-password"
                        tabIndex={2}
                        data-testid="password-input"
                        className={`${styles.glassmorphismInput} h-12 px-4 pr-12 text-base text-white placeholder:text-white/70 focus:ring-0 focus:ring-offset-0`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-0 h-12 px-3 py-0 hover:bg-transparent text-white/70 hover:text-white transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              disabled={isPending}
              type="submit"
              size="lg"
              tabIndex={3}
              data-testid="signin-button"
              className={`${styles.glassmorphismButton} w-full h-12 text-base font-semibold text-white focus:ring-0 focus:ring-offset-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="xs" variant="inline" color="white" />
                  Signing in...
                </div>
              ) : "Sign in"}
            </Button>

            
          </form>
        </Form>
        </CardContent>

        <ForgotPasswordModal
          open={showForgotPassword}
          onOpenChange={setShowForgotPassword}
        />
      </Card>
    </div>
  );
};
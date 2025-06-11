"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { changePasswordSchema } from "../schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DottedSeparator } from "@/components/dotted-separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChangePassword } from "../api/use-change-password";
import { cn } from "@/lib/utils";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface ChangePasswordFormProps {
  onCancel?: () => void;
}

export const ChangePasswordForm = ({ onCancel }: ChangePasswordFormProps) => {
  const { mutate, isPending } = useChangePassword();
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  const form = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: z.infer<typeof changePasswordSchema>) => {
    mutate({ json: values }, {
      onSuccess: () => {
        form.reset();
        onCancel?.();
      }
    });
  };

  const togglePasswordVisibility = (field: 'old' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <Card className="w-full h-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-xl font-bold">
            Change Password
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Update your account password to keep your account secure
        </p>
      </CardHeader>
      <div className="px-7">
        <DottedSeparator />
      </div>
      <CardContent className="p-7">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-y-4">
              <FormField
                control={form.control}
                name="oldPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Current Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPasswords.old ? "text" : "password"}
                          placeholder="Enter your current password"
                          disabled={isPending}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('old')}
                          disabled={isPending}
                        >
                          {showPasswords.old ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      New Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPasswords.new ? "text" : "password"}
                          placeholder="Enter your new password"
                          disabled={isPending}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('new')}
                          disabled={isPending}
                        >
                          {showPasswords.new ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
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
                    <FormLabel>
                      Confirm New Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPasswords.confirm ? "text" : "password"}
                          placeholder="Confirm your new password"
                          disabled={isPending}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('confirm')}
                          disabled={isPending}
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DottedSeparator />
              
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  onClick={onCancel}
                  disabled={isPending}
                  className={cn(!onCancel && "invisible")}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isPending}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isPending ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
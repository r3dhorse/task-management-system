"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  UserPlusIcon, 
  MailIcon, 
  UserIcon,
  KeyIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon
} from "@/lib/lucide-icons";
import { useRegisterUser } from "../api/use-register-user";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MemberRole } from "../types";

const registerUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password confirmation is required"),
  role: z.nativeEnum(MemberRole),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterUserFormData = z.infer<typeof registerUserSchema>;

interface RegisterUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export const RegisterUserModal = ({ isOpen, onClose, workspaceId }: RegisterUserModalProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ name: string; email: string } | null>(null);

  const form = useForm<RegisterUserFormData>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: MemberRole.MEMBER,
    },
  });

  const { mutate: registerUser, isPending: isRegistering } = useRegisterUser();

  const handleSubmit = (values: RegisterUserFormData) => {
    registerUser(
      {
        name: values.name,
        email: values.email,
        password: values.password,
        workspaceId,
        role: values.role,
      },
      {
        onSuccess: (_data) => {
          setCreatedUser({ name: values.name, email: values.email });
          setRegistrationSuccess(true);
          form.reset();
        },
        onError: (_error) => {
          // Error handling is done in the hook
        },
      }
    );
  };

  const handleClose = () => {
    if (registrationSuccess) {
      setRegistrationSuccess(false);
      setCreatedUser(null);
    }
    form.reset();
    onClose();
  };

  const handleContinue = () => {
    setRegistrationSuccess(false);
    setCreatedUser(null);
    form.reset();
  };

  if (registrationSuccess && createdUser) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              User Created Successfully
            </DialogTitle>
            <DialogDescription>
              The new user has been registered and added to the workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-full p-2">
                  <UserIcon className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-green-900">{createdUser.name}</p>
                  <div className="flex items-center gap-1 text-sm text-green-700">
                    <MailIcon className="h-3 w-3" />
                    <span>{createdUser.email}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <UserPlusIcon className="h-3 w-3 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">
                    What happens next?
                  </p>
                  <p className="text-xs text-blue-700">
                    The user can now sign in with their email and password. They have been automatically added to this workspace with the selected role.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleContinue}>
              Create Another User
            </Button>
            <Button onClick={handleClose} className="bg-green-600 hover:bg-green-700">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlusIcon className="h-5 w-5 text-blue-600" />
            Register New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account and add them to this workspace.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Full Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter full name"
                      disabled={isRegistering}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MailIcon className="h-4 w-4" />
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="Enter email address"
                      disabled={isRegistering}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <KeyIcon className="h-4 w-4" />
                    Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        disabled={isRegistering}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={isRegistering}
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password Field */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <KeyIcon className="h-4 w-4" />
                    Confirm Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        disabled={isRegistering}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={isRegistering}
                      >
                        {showConfirmPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role Selection */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isRegistering}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={MemberRole.MEMBER}>
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          <span>Member</span>
                          <span className="text-xs text-gray-500">- Standard access</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={MemberRole.ADMIN}>
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="h-4 w-4" />
                          <span>Administrator</span>
                          <span className="text-xs text-gray-500">- Full access</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={MemberRole.VISITOR}>
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          <span>Visitor</span>
                          <span className="text-xs text-gray-500">- Limited access</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <UserPlusIcon className="h-3 w-3 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">
                    Creating a new user account
                  </p>
                  <p className="text-xs text-blue-700">
                    This will create a new user account that can sign in to the platform. The user will be automatically added to this workspace with the selected role.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isRegistering}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRegistering}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRegistering ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creating User...
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
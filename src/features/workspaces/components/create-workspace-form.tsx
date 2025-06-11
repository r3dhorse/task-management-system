"use client"

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createWorkspaceSchema } from "../schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { DottedSeparator } from "@/components/dotted-separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreateWorkspace } from "../api/use-create-workspace";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCurrent } from "@/features/auth/api/use-current";
import { canCreateWorkspace } from "@/features/auth/utils";


interface CreateWorkspaceFormProps {
  onCancel?: () => void;
}

export const CreateWorkspaceForm = ({ onCancel }: CreateWorkspaceFormProps) => {
  const router = useRouter();
  const { mutate, isPending } = useCreateWorkspace();
  const { data: user } = useCurrent();
  
  const isAdmin = canCreateWorkspace(user ?? null);



  const form = useForm<z.infer<typeof createWorkspaceSchema>>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = (values: z.infer<typeof createWorkspaceSchema>) => {
    mutate({ json: values }, {
      onSuccess: ({ data }) => {
        form.reset();
        router.push(`/workspaces/${data.$id}`);
      }
    });

  };

  return (
    <Card className="w-full h-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <CardTitle className="text-xl font-bold">
          Create a new workspace
        </CardTitle>
        {!isAdmin && (
          <p className="text-sm text-muted-foreground text-red-600">
            Only admin users can create workspaces
          </p>
        )}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Workspace Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter workspace name"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description (Optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter workspace description"
                        rows={3}
                      />
                    </FormControl>
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
                  disabled={isPending || !isAdmin}
                >
                  Create Workspace
                </Button>
              </div>

            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
